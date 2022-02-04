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

  svgLayer?: D3.Selection<SVGSVGElement, unknown, null, undefined>;
  plotLayer?: D3.Selection<SVGGElement, unknown, null, undefined>;
  defsLayer?: D3.Selection<SVGGElement, unknown, null, undefined>;
  maskLayer?: D3.Selection<SVGMaskElement, unknown, null, undefined>;

  maskMargin: number = 1000000;

  readonly mapWidth: number = 600;
  readonly mapHeight: number = 480;

  private get svgRootElement() {
    return D3.select('polygonSVG');
  }

  private get svgCircleElements() {
    return this.svgRootElement.selectAll<SVGCircleElement, number>('circle');
  }

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {
      console.log('subscribe geo');
      this.setNowCoordinatesFromGeoPos(position);
      this.updateMapView(this.nowCoordinates);
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
   * マップの表示を更新する
   */
  updateMapView(coordinates: Coordinates | undefined) {
    if (coordinates !== undefined) {
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
      this.addWalkedPathVertex(coordinates);
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

    this.map.on('click', (e: Leaflet.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (this.isClickToMove == true) {
        this.setNowCoordinatesFromCoordintates(new Coordinates(lat, lng));
        this.updateMapView(new Coordinates(lat, lng));
      }
    });

    this.map.on('move', () => {
      this.drawUpdateSVGLayer();
    });
  }

  /**
   * 地図表示時に1回だけ実行するSVG描画処理
   */
  drawInitSVG() {
    if (this.map === undefined) {
      return;
    }

    this.svgLayer = D3.select(this.map.getPanes().overlayPane)
      .append('svg')
      .attr('width', this.mapWidth)
      .attr('height', this.mapHeight)
      .attr('class', 'leaflet-zoom-hide');
    this.plotLayer = this.svgLayer?.append('g').attr('id', 'polygonSVG');

    this.defsLayer = this.plotLayer.append('defs');
    this.maskLayer = this.defsLayer.append('mask').attr('id', 'mask');

    this.maskLayer
      .data([new Position(this.map.getCenter().lat, this.map.getCenter().lng, this.map.latLngToLayerPoint([this.map.getCenter().lat, this.map.getCenter().lng]))])
      .append('rect')
      .attr('class', 'rect')
      .attr('x', (d) => d.x - (this.mapWidth + this.maskMargin)/2)
      .attr('y', (d) => d.y - (this.mapWidth + this.maskMargin)/2)
      .attr('width', this.mapWidth + this.maskMargin)
      .attr('height', this.mapHeight + this.maskMargin)
      .style('opacity', 1)
      .style('fill', 'white');

    this.plotLayer
      .selectAll('rects')
      .data([new Position(90, 90, this.map.latLngToLayerPoint([90, 90]))])
      .enter()
      .append('rect')
      .attr('id', 'mask-rect')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', 10000000)
      .attr('height', 10000000)
      .attr('mask', 'url(#mask)')
      .attr('fill', 'gray');
  }

  /**
   * 地図移動時に毎回実行するSVGレイヤー更新処理
   */
  drawUpdateSVGLayer() {
    if (
      this.map === undefined ||
      this.svgLayer === undefined ||
      this.plotLayer === undefined
    ) {
      return;
    }

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

    this.plotLayer.selectAll('circle').each((d, n, elms) => {
      if (this.map === undefined) return;
      const data = d as Position;
      data.setLayerPoint(
        this.map.latLngToLayerPoint(
          new Leaflet.LatLng(data.latitude, data.longitude)
        )
      );
      D3.select(elms[n]).attr('cx', data.x).attr('cy', data.y);
    });

    this.maskLayer?.selectAll('rect').each((d, n, elms) => {
      if (this.map === undefined || this.nowCoordinates === undefined) return;
      const data = d as Position;
      data.setLayerPoint(
        this.map.latLngToLayerPoint(
          new Leaflet.LatLng(this.nowCoordinates.latitude, this.nowCoordinates.longitude)
        )
      );
      D3.select(elms[n]).attr('x', data.x - (this.mapWidth + this.maskMargin)/2).attr('y', data.y - (this.mapWidth + this.maskMargin)/2);
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
  addWalkedPathVertex(coordinates: Coordinates | undefined) {
    if (this.isTrackingUser == true && coordinates !== undefined) {
      this.walkedPath?.addLatLng([coordinates.latitude, coordinates.longitude]);
      this.addWalkedPolygon(coordinates);
    }
  }

  addWalkedPolygon(coordinates: Coordinates) {
    const polygonSize = 0.001;
    if (
      this.map !== undefined &&
      this.plotLayer !== undefined &&
      this.maskLayer !== undefined &&
      this.nowCoordinates !== undefined
    ) {
      const LeftUp = new Position(
        this.nowCoordinates.latitude - polygonSize,
        this.nowCoordinates.longitude - polygonSize,
        this.map.latLngToLayerPoint([
          this.nowCoordinates.latitude - polygonSize,
          this.nowCoordinates.longitude - polygonSize,
        ])
      );
      const LeftDown = new Position(
        this.nowCoordinates.latitude + polygonSize,
        this.nowCoordinates.longitude - polygonSize,
        this.map.latLngToLayerPoint([
          this.nowCoordinates.latitude + polygonSize,
          this.nowCoordinates.longitude - polygonSize,
        ])
      );
      const RightDown = new Position(
        this.nowCoordinates.latitude + polygonSize,
        this.nowCoordinates.longitude + polygonSize,
        this.map.latLngToLayerPoint([
          this.nowCoordinates.latitude + polygonSize,
          this.nowCoordinates.longitude + polygonSize,
        ])
      );
      const RightUp = new Position(
        this.nowCoordinates.latitude - polygonSize,
        this.nowCoordinates.longitude + polygonSize,
        this.map.latLngToLayerPoint([
          this.nowCoordinates.latitude - polygonSize,
          this.nowCoordinates.longitude + polygonSize,
        ])
      );

      this.maskLayer
        .data([new Position(this.nowCoordinates.latitude, this.nowCoordinates.longitude, this.map.latLngToLayerPoint([this.nowCoordinates.latitude, this.nowCoordinates.longitude]))])
        .append('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 50);
    }
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
