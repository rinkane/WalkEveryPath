export class Coordinates{
  /**
   * 緯度
   */
  latitude: number;

  /**
   * 経度
   */
  longitude: number;

  constructor(private readonly _latitude: number, private readonly _longitude: number){
    this.latitude = _latitude;
    this.longitude = _longitude;
  }
}
