import { Component, OnInit } from '@angular/core';
import * as Leaflet from 'leaflet';
import { GeolocationService } from '@ng-web-apis/geolocation';
import { Coordinates } from '../shared/model/Coordinates';

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

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {
      this.setNowCoordinates(position);
      this.updateMapView();
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  /**
   * 現在の使用者の位置情報を更新する
   * @param position Geolocation APIから取得した位置情報
   */
  setNowCoordinates(position: GeolocationPosition) {
    this.nowCoordinates = new Coordinates(
      position.coords.latitude,
      position.coords.longitude
    );
  }

  /**
   * マップの表示を更新する
   */
  updateMapView(): void {
    if (this.nowCoordinates !== undefined) {
      if (this.map === undefined) {
        this.showMap(this.nowCoordinates);
        this.putMarker(this.nowCoordinates);
        this.initLines();
      } else {
        this.setMarkerPosition(this.nowCoordinates);
      }
      this.addWalkedPathVertex(this.nowCoordinates);
    }

    this.geolocateLoadCount++;
  }

  /**
   * ページ上に地図を表示する
   * @param coordinates 使用者の座標
   */
  showMap(coordinates: Coordinates): void {
    const zoom = 15;

    this.map = Leaflet.map('map').setView(
      [coordinates.latitude, coordinates.longitude],
      zoom
    );

    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  /**
   * これまで通過したルートを線で描画する
   */
  initLines() {
    if (this.map !== undefined) {
      this.walkedPath = Leaflet.polyline([], {
        color: 'blue',
        weight: 3,
      }).addTo(this.map);
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
      });

      this.marker = Leaflet.marker(
        [coordinates.latitude, coordinates.longitude],
        {
          icon: icon,
        }
      );

      this.marker.addTo(this.map);
    }
  }

  /**
   * マーカーの位置を使用者の現在位置に更新する
   * @param coordinates 使用者の座標
   */
  setMarkerPosition(coordinates: Coordinates) {
    this.marker?.setLatLng([coordinates.latitude, coordinates.longitude]);
  }

  /**
   * これまでの移動経路の頂点を追加する
   * @param coordinates 使用者の座標
   */
  addWalkedPathVertex(coordinates: Coordinates) {
    this.walkedPath?.addLatLng([coordinates.latitude, coordinates.longitude]);
  }
}
