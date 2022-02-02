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
  coordinates?: Coordinates;
  mapLoadCount: number = 0;
  marker?: Leaflet.Marker<any>;

  constructor(private readonly geolocation$: GeolocationService) {
    this.geolocation = geolocation$;
    this.geolocation.subscribe((position) => {
      this.coordinates = new Coordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      const zoom = 15;

      if (this.map === undefined) {
        this.map = Leaflet.map('map').setView(
          [this.coordinates.latitude, this.coordinates.longitude],
          zoom
        );

        Leaflet.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }
        ).addTo(this.map);
      }

      if (this.marker !== undefined) {
        this.map.removeLayer(this.marker);
      }

      this.marker = Leaflet.marker([
        this.coordinates.latitude,
        this.coordinates.longitude,
      ]);
      this.marker.addTo(this.map);

      this.mapLoadCount++;
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}
}
