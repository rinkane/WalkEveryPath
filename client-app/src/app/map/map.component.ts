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
  map: any;
  geolocation: GeolocationService;
  coordinates?: Coordinates;
  mapLoadCount: number = 0;

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {

      this.coordinates = new Coordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      this.map = Leaflet.map('map').setView(
        [this.coordinates.latitude, this.coordinates.longitude],
        13
      );
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.map);

      this.mapLoadCount++;
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}
}
