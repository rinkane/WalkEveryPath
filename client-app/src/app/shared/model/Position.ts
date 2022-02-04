import * as Leaflet from 'leaflet';

/**
 * 描画するSVGのデータクラス
 */
export class Position {
  /**
   * 緯度
   */
  latitude: number;

  /**
   * 経度
   */
  longitude: number;

  /**
   * x座標
   */
  x: number;

  /**
   * y座標
   */
  y: number;

  constructor(_latitude: number, _longitude: number, _x: number, _y: number);
  constructor(_x: number, _y: number, _latlng: Leaflet.LatLng);
  constructor(_lat: number, _lng: number, _pos: Leaflet.Point);

  constructor(
    private readonly val1: number,
    private readonly val2: number,
    private readonly val3: number | Leaflet.LatLng | Leaflet.Point,
    private readonly val4?: number
  ) {
    if (typeof val3 === 'number' && val4 !== undefined) {
      this.latitude = val1;
      this.longitude = val2;

      this.x = val3;
      this.y = val4;
    } else if (typeof val3 !== 'number' && 'lat' in val3) {
      const latlng = val3 as Leaflet.LatLng;

      this.x = val1;
      this.y = val2;

      this.latitude = latlng.lat;
      this.longitude = latlng.lng;
    } else {
      const point = val3 as Leaflet.Point;

      this.latitude = val1;
      this.longitude = val2;

      this.x = point.x;
      this.y = point.y;
    }
  }

  /**
   * 描画するレイヤー上での位置を設定する
   * @param point Leafletで緯度/経度から変換したレイヤ上での位置
   */
  setLayerPoint(point: Leaflet.Point){
    this.x = point.x;
    this.y = point.y;
  }
}
