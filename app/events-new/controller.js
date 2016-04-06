import Ember from 'ember';
import {
  dmsToDecimal,
  gpsDirection
} from 'wander/lib/gps';

import { task } from 'ember-concurrency';
import { categories } from 'wander/categories';
import readFile from 'wander/lib/read-file';

const {
  Controller,
  get, set,
  inject: { service },
  run
} = Ember;

export default Controller.extend({
  exif: service(),
  selectVenue: false,

  file: null,
  uploader: null,

  categories: categories,

  save: task(function * () {
    yield this.store.createRecord('event', get(this, 'model')).save();
    this.transitionToRoute('events');
  }).drop(),

  getLatAndLngWithFile(file) {
    const self = this;
    const exif = this.get('exif');

    exif.getData(file, function() {
      const lat = gpsDirection(
        exif.getTag(this, 'GPSLatitudeRef'),
        dmsToDecimal.apply(this, exif.getTag(this, 'GPSLatitude'))
      );

      const lng = gpsDirection(
        exif.getTag(this, 'GPSLongitudeRef'),
        dmsToDecimal.apply(this, exif.getTag(this, 'GPSLongitude'))
      );

      const gpsAltitude = exif.getTag(this, 'GPSAltitude');
      const altitude = gpsAltitude ? gpsAltitude.numerator : null;

      if(lat && lng) {
        self.send('geoLocationSuccess', {
          latitude: lat,
          longitude: lng,
          altitude: altitude
        });
      }
    });
  },

  actions: {
    selectVenue(venue) {
      set(this, 'model.venue', venue);
      set(this, 'selectVenue', false);
    },

    showSelectVenue() {
      set(this, 'selectVenue', true);
    },

    hideSelectVenue() {
      set(this, 'selectVenue', false);
    },

    geoLocationSuccess(data) {
      set(this, 'model.geolocation', data);
    },

    weatherSuccess(data) {
      set(this, 'model.weather', data);
    },

    save() {
      this.get('save').perform();
    },

    fileLoaded(file) {
      this.getLatAndLngWithFile(file);

      readFile(file, 'readAsDataURL').then((convertedFile) => {
        set(this, 'model.photo', convertedFile);
      });
    },

    categorySelected(category) {
      set(this, 'model.category', category);
    },

    // old s3 uploader
    // fileAdded(file, uploader) {
    //   set(this, 'file', file);
    //   set(this, 'uploader', uploader);
    //
    //   this.getLatAndLngWithFile(file);
    // },
    // uploadProgress(data) {
    // },
    // uploadFinished(uploadedUrl, data) {
    // },
    // uploadFailed(error) {
    //   console.log('upload failed');
    //   console.log(error);
    // }
  }
});
