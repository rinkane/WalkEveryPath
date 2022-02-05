import { Component, OnInit } from '@angular/core';
import { GeolocationService } from '@ng-web-apis/geolocation';
import { Coordinates } from '../shared/model/Coordinates';
import { Position } from '../shared/model/Position';
import * as Leaflet from 'leaflet';
import * as D3 from 'd3';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  /**
   * Leafletで描画する地図クラス
   */
  map?: Leaflet.Map;

  /**
   * Leafletで利用者が通ってきた経路に描画する線
   */
  walkedPath?: Leaflet.Polyline;

  /**
   * Leafletで利用者のいる位置に描画するマーカー
   */
  marker?: Leaflet.Marker<any>;

  /**
   * 位置情報APIクラス
   */
  geolocation: GeolocationService;

  /**
   * 現在の利用者のいる座標
   */
  nowCoordinates?: Coordinates;

  /**
   * デバッグ用に使用する位置情報を読み込んだ回数
   */
  geolocateLoadCount: number = 0;

  /**
   * クリックした場所に移動できるモードかどうか
   */
  isClickToMove: boolean = false;

  /**
   * 使用者の移動を追跡するモードかどうか
   */
  isTrackingUser: boolean = false;

  /**
   * SVG全体をまとめるレイヤー
   */
  svgLayer?: D3.Selection<SVGSVGElement, unknown, null, undefined>;

  /**
   * 地図に描画するSVGを配置するレイヤー
   */
  plotLayer?: D3.Selection<SVGGElement, unknown, null, undefined>;

  /**
   * 定義するだけで描画はしないSVGを配置するレイヤー
   */
  defsLayer?: D3.Selection<SVGGElement, unknown, null, undefined>;

  /**
   * 地図に描画しているSVGをマスクするSVGを配置するレイヤー
   */
  maskLayer?: D3.Selection<SVGMaskElement, unknown, null, undefined>;

  /**
   * 地図全体をマスクするSVGを画面外にどれだけ描画するかを表すマージン
   * TODO: とりあえず地図スクロール時に画面端がスクロール中マスクされなくなるのを防ぐために暫定で用意している
   */
  maskMargin: number = 1000000;

  /**
   * 地図の横幅
   */
  readonly mapWidth: number = 600;

  /**
   * 地図の縦幅
   */
  readonly mapHeight: number = 480;

  /**
   * マスクさせないために定義する円形のSVGの直径
   */
  private get unmaskCircleSize() {
    if (this.map === undefined) return 0;
    return Math.pow(2, this.map.getZoom() - 10);
  }

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {
      const beforeCoordinates = this.createCoordinates(this.nowCoordinates);
      this.setNowCoordinatesFromGeoPos(position);
      this.updateMapView(this.nowCoordinates, beforeCoordinates);
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  /**
   * 現在の使用者の位置情報を更新する
   * @param position Geolocation APIから取得した位置情報
   */
  setNowCoordinatesFromGeoPos(position: GeolocationPosition) {
    this.nowCoordinates = new Coordinates(
      position.coords.latitude,
      position.coords.longitude
    );
  }

  /**
   * 現在の使用者の位置情報を更新する
   * @param coordinates 座標
   */
  setNowCoordinatesFromCoordintates(coordinates: Coordinates) {
    this.nowCoordinates = new Coordinates(
      coordinates.latitude,
      coordinates.longitude
    );
  }

  /**
   * 引数の座標情報を使って、新しい座標情報のインスタンスを作成する
   * @param coordinates 座標情報
   * @returns 与えられた座標情報と同じ情報を持つ新しいインスタンス
   */
  createCoordinates(
    coordinates: Coordinates | undefined
  ): Coordinates | undefined {
    if (coordinates === undefined) return undefined;
    return new Coordinates(coordinates.latitude, coordinates.longitude);
  }

  /**
   * 地図の表示を更新する
   * @param coordinates 現在の使用者の位置
   * @param beforeCoordinates 直前の使用者の位置
   */
  updateMapView(
    coordinates: Coordinates | undefined,
    beforeCoordinates?: Coordinates | undefined
  ) {
    if (coordinates !== undefined) {
      // 地図がまだ読み込まれていない場合
      if (this.map === undefined) {
        this.showMap(coordinates);
        this.putMarker(coordinates);
        this.initLines();
      } else {
        this.setMarkerCoordinates(coordinates);
        if (this.isTrackingUser === true) {
          this.setMapCoordinates(coordinates);
        }
      }
      this.addWalkedPathVertex(coordinates, beforeCoordinates);
    }

    this.geolocateLoadCount++;
  }

  /**
   * ページ上に地図を表示する
   * @param coordinates 使用者の座標
   */
  showMap(coordinates: Coordinates) {
    const zoom = 15;
    this.map = Leaflet.map('map').setView(
      [coordinates.latitude, coordinates.longitude],
      zoom
    );

    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.drawInitSVG();
    this.addMapEventListener();
  }

  /**
   * 地図のクリック、ズーム・移動などのイベント受け取り時の処理を追加する
   */
  addMapEventListener() {
    if (this.map === undefined) return;
    this.map.on('click', (e: Leaflet.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (this.isClickToMove == true) {
        const beforeCoordinates = this.createCoordinates(this.nowCoordinates);

        this.setNowCoordinatesFromCoordintates(new Coordinates(lat, lng));
        this.updateMapView(this.nowCoordinates, beforeCoordinates);
      }
    });

    this.map.on('move', () => {
      this.updateMoveSVGLayer();
    });

    this.map.on('zoom', () => {
      this.updateZoomSVGLayer();
    })
  }

  /**
   * 地図表示時に1回だけ実行するSVG描画処理
   */
  drawInitSVG() {
    if (this.map === undefined) {
      return;
    }
    this.initLayer();
    this.initMask();
  }

  /**
   * SVGを描画するレイヤーの初期化、タグの作成を行う
   */
  initLayer() {
    if (this.map === undefined) return;
    this.svgLayer = D3.select(this.map.getPanes().overlayPane)
      .append('svg')
      .attr('width', this.mapWidth)
      .attr('height', this.mapHeight)
      .attr('class', 'leaflet-zoom-hide');
    this.plotLayer = this.svgLayer?.append('g').attr('id', 'polygonSVG');

    this.defsLayer = this.plotLayer.append('defs');
    this.maskLayer = this.defsLayer.append('mask').attr('id', 'mask');
  }

  /**
   * マスク処理を行うSVGを初期化する
   */
  initMask() {
    if (
      this.map === undefined ||
      this.maskLayer === undefined ||
      this.plotLayer === undefined
    )
      return;
    this.maskLayer
      .data([
        new Position(
          this.map.getCenter().lat,
          this.map.getCenter().lng,
          this.map.latLngToLayerPoint([
            this.map.getCenter().lat,
            this.map.getCenter().lng,
          ])
        ),
      ])
      .append('rect')
      .attr('class', 'rect')
      .attr('x', (d) => d.x - (this.mapWidth + this.maskMargin) / 2)
      .attr('y', (d) => d.y - (this.mapWidth + this.maskMargin) / 2)
      .attr('width', this.mapWidth + this.maskMargin)
      .attr('height', this.mapHeight + this.maskMargin)
      .style('opacity', 1)
      .style('fill', 'white');

    this.plotLayer
      .selectAll('rects')
      .data([
        new Position(
          this.map.getCenter().lat,
          this.map.getCenter().lng,
          this.map.latLngToLayerPoint([
            this.map.getCenter().lat,
            this.map.getCenter().lng,
          ])
        ),
      ])
      .enter()
      .append('rect')
      .attr('id', 'mask-rect')
      .attr('x', (d) => d.x - (this.mapWidth + this.maskMargin) / 2)
      .attr('y', (d) => d.y - (this.mapWidth + this.maskMargin) / 2)
      .attr('width', this.mapWidth + this.maskMargin)
      .attr('height', this.mapHeight + this.maskMargin)
      .attr('mask', 'url(#mask)')
      .attr('fill', 'gray');
  }

  /**
   * 地図移動時に毎回実行するSVGレイヤー更新処理
   */
  updateMoveSVGLayer() {
    this.updateLayer();
    this.updateMask();
  }

  /**
   * 地図ズーム時に毎回実行するSVGレイヤー更新処理
   */
  updateZoomSVGLayer() {
    this.updateUnMaskedArea();
  }

  /**
   * 地図にSVGを描画するレイヤーを更新する
   */
  updateLayer() {
    if (
      this.map === undefined ||
      this.svgLayer === undefined ||
      this.plotLayer === undefined
    )
      return;

    var bounds = this.map.getBounds();
    var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
    var bottomRight = this.map.latLngToLayerPoint(bounds.getSouthEast());

    this.svgLayer
      .attr('width', bottomRight.x - topLeft.x)
      .attr('height', bottomRight.y - topLeft.y)
      .style('left', topLeft.x + 'px')
      .style('top', topLeft.y + 'px');

    this.plotLayer.attr(
      'transform',
      'translate(' + -topLeft.x + ',' + -topLeft.y + ')'
    );
  }

  /**
   * マスクするSVGの描画を更新する
   */
  updateMask() {
    this.maskLayer?.selectAll('rect').each((d, n, elms) => {
      if (this.map === undefined || this.nowCoordinates === undefined) return;
      const data = d as Position;
      data.setLayerPoint(
        this.map.latLngToLayerPoint(
          new Leaflet.LatLng(
            this.nowCoordinates.latitude,
            this.nowCoordinates.longitude
          )
        )
      );
      D3.select(elms[n])
        .attr('x', data.x - (this.mapWidth + this.maskMargin) / 2)
        .attr('y', data.y - (this.mapWidth + this.maskMargin) / 2);
    });

    this.plotLayer?.selectAll('rect').each((d, n, elms) => {
      if (this.map === undefined || this.nowCoordinates === undefined) return;
      const data = d as Position;
      data.setLayerPoint(
        this.map.latLngToLayerPoint(
          new Leaflet.LatLng(
            this.nowCoordinates.latitude,
            this.nowCoordinates.longitude
          )
        )
      );
      D3.select(elms[n])
        .attr('x', data.x - (this.mapWidth + this.maskMargin) / 2)
        .attr('y', data.y - (this.mapWidth + this.maskMargin) / 2);
    });
  }

  /**
   * マスクしない領域をしめすSVGの描画を更新する
   */
  updateUnMaskedArea() {
    this.maskLayer?.selectAll('circle').each((d, n, elms) => {
      if (this.map === undefined) return;
      const data = d as Position;
      data.setLayerPoint(
        this.map.latLngToLayerPoint(
          new Leaflet.LatLng(data.latitude, data.longitude)
        )
      );
      D3.select(elms[n])
        .attr('r', this.unmaskCircleSize)
        .attr('cx', data.x)
        .attr('cy', data.y);
    });

    this.maskLayer?.selectAll('polygon').each((d, n, elms) => {
      const data = d as Position[];
        data.forEach((pos) => {
          if(this.map === undefined) return;
          pos.setLayerPoint(
            this.map.latLngToLayerPoint(
              new Leaflet.LatLng(pos.latitude, pos.longitude)
            )
          );
          D3.select(elms[n])
            .attr('points', this.createUnMaskPolygonPointsAttr(data));
        })
    })
  }

  /**
   * これまで通ってきた経路を線で描画する
   */
  initLines() {
    this.removeIfWalkedPathIsPoint();

    if (this.map !== undefined) {
      this.walkedPath = Leaflet.polyline([], {
        color: 'blue',
        weight: 3,
      }).addTo(this.map);
      D3.select('map').data();
    }
  }

  /**
   * これまで通ってきた経路が点だった場合、つまり移動していない場合、
   * その経路を地図から削除する
   */
  removeIfWalkedPathIsPoint() {
    if (
      this.walkedPath?.getLatLngs().length !== undefined &&
      this.walkedPath?.getLatLngs().length < 2
    ) {
      this.map?.removeLayer(this.walkedPath);
    }
  }

  /**
   * 使用者の現在位置にマーカーを置く
   * @param coordinates 使用者の座標
   */
  putMarker(coordinates: Coordinates): void {
    if (this.map !== undefined) {
      if (this.marker !== undefined) {
        this.map.removeLayer(this.marker);
      }

      const icon = Leaflet.icon({
        iconUrl: '../../assets/Icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      this.marker = Leaflet.marker(
        [coordinates.latitude, coordinates.longitude],
        {
          icon: icon,
        }
      ).addTo(this.map);
    }
  }

  /**
   * マーカーの位置を使用者の現在位置に更新する
   * @param coordinates 使用者の座標
   */
  setMarkerCoordinates(coordinates: Coordinates) {
    this.marker?.setLatLng([coordinates.latitude, coordinates.longitude]);
  }

  /**
   * 地図の表示座標を指定した座標を中心とした位置に変更する
   * @param coordinates
   */
  setMapCoordinates(coordinates: Coordinates) {
    this.map?.setView([coordinates.latitude, coordinates.longitude]);
  }

  /**
   * これまでの移動経路の頂点を追加する
   * @param coordinates 使用者の座標
   */
  addWalkedPathVertex(
    coordinates: Coordinates | undefined,
    beforeCoordinates: Coordinates | undefined
  ) {
    if (this.isTrackingUser == true && coordinates !== undefined) {
      this.walkedPath?.addLatLng([coordinates.latitude, coordinates.longitude]);
      this.addWalkedArea(coordinates, beforeCoordinates);
    }
  }

  /**
   * 移動経路を表示するため、マスクを解除する領域を追加する
   * @param coordinates 使用者の座標
   */
  addWalkedArea(
    coordinates: Coordinates,
    beforeCoordinates: Coordinates | undefined
  ) {
    if (
      this.map !== undefined &&
      this.plotLayer !== undefined &&
      this.maskLayer !== undefined
    ) {
      this.maskLayer
        .data([
          new Position(
            coordinates.latitude,
            coordinates.longitude,
            this.map.latLngToLayerPoint([
              coordinates.latitude,
              coordinates.longitude,
            ])
          ),
        ])
        .append('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', this.unmaskCircleSize);

      if (beforeCoordinates !== undefined) {
        this.maskLayer
          .data([
            [
              new Position(
                coordinates.latitude,
                coordinates.longitude,
                this.map.latLngToLayerPoint([
                  coordinates.latitude,
                  coordinates.longitude,
                ])
              ),
              new Position(
                beforeCoordinates.latitude,
                beforeCoordinates.longitude,
                this.map.latLngToLayerPoint([
                  beforeCoordinates.latitude,
                  beforeCoordinates.longitude,
                ])
              ),
            ],
          ])
          .append('polygon')
          .attr('points', (d) => this.createUnMaskPolygonPointsAttr(d));
      }
    }
  }

  /**
   * マスクしない領域を定義するための多角形SVGのpoints属性テキストを作って返す
   * @param positions 現在の位置と直前の位置の位置情報配列
   * @returns 多角形SVGのpoints属性テキスト
   */
  createUnMaskPolygonPointsAttr(positions: Position[]): string {
    const vector = [positions[0].x - positions[1].x, positions[0].y - positions[1].y];
    const vectorValue = Math.pow(Math.pow(vector[0], 2) + Math.pow(vector[1], 2), 0.5);
    const unitVector = [vector[0] / vectorValue, vector[1] / vectorValue];
    const unitVectorValue = Math.pow(Math.pow(unitVector[0], 2) + Math.pow(unitVector[1], 2), 0.5);
    console.log(unitVector);
    console.log(unitVectorValue);
    console.log([positions[0].x + (this.unmaskCircleSize * unitVector[1]), positions[0].y + (this.unmaskCircleSize * unitVector[0])]);
    console.log([positions[0].x + (this.unmaskCircleSize * -unitVector[1]), positions[0].y + (this.unmaskCircleSize * -unitVector[0])]);

    const pointsText =
      (positions[0].x + (this.unmaskCircleSize * -unitVector[1])) +
      ',' +
      (positions[0].y + (this.unmaskCircleSize * unitVector[0])) +
      ' ' +
      (positions[0].x + (this.unmaskCircleSize * unitVector[1])) +
      ',' +
      (positions[0].y + (this.unmaskCircleSize * -unitVector[0])) +
      ' ' +
      (positions[1].x + (this.unmaskCircleSize * unitVector[1])) +
      ',' +
      (positions[1].y + (this.unmaskCircleSize * -unitVector[0])) +
      ' ' +
      (positions[1].x + (this.unmaskCircleSize * -unitVector[1])) +
      ',' +
      (positions[1].y + (this.unmaskCircleSize * unitVector[0])) +
      ' ';

    return pointsText;
  }

  /**
   * クリックした場所に移動できるモードかどうか切り替える
   */
  changeIsClickMoveMode() {
    this.isClickToMove = !this.isClickToMove;
  }

  /**
   * 使用者の移動を追跡するモードかどうか切り替える
   */
  changeIsTrackingUserMode() {
    this.isTrackingUser = !this.isTrackingUser;

    if (this.isTrackingUser == true) {
      this.startTracingUser();
    } else {
      this.endTrackingUser();
    }
  }

  /**
   * 使用者の移動の追跡を開始する
   */
  startTracingUser() {
    this.updateMapView(this.nowCoordinates);
    this.map?.dragging.disable();
    this.map?.scrollWheelZoom.disable();
    this.map?.touchZoom.disable();
    this.map?.tap?.disable();
    this.map?.doubleClickZoom.disable();
    this.map?.boxZoom.disable();
    this.map?.keyboard.disable();
  }

  /**
   * 使用者の移動の追跡を終了する
   */
  endTrackingUser() {
    this.initLines();
    this.map?.dragging.enable();
    this.map?.scrollWheelZoom.enable();
    this.map?.touchZoom.enable();
    this.map?.tap?.enable();
    this.map?.doubleClickZoom.enable();
    this.map?.boxZoom.enable();
    this.map?.keyboard.enable();
  }
}
