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
  map?: Leaflet.Map;
  geolocation: GeolocationService;
  marker?: Leaflet.Marker<any>;
  nowCoordinates?: Coordinates;
  walkedPath?: Leaflet.Polyline;
  mapLoadCount: number = 0;

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {
      this.updateNowCoordinates(position);
      this.updateMapView();
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  /**
   * 現在の使用者の位置情報を更新する
   * @param position Geolocation APIから取得した位置情報
   */
  updateNowCoordinates(position: GeolocationPosition) {
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

    this.mapLoadCount++;
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
