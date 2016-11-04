/**
 * TODO: (1) Add callbacks from _debounceRGB() to array & call all of them
 * when http request finishes
 * (2) Look in to Homebridge becoming unresponsive (maybe related to bad
 * callback calls - ie. line 243)
 */

var Service, Characteristic;
var request = require('request'),
    chroma = require('chroma-js'),
    _ = require('underscore');

/**
 * @module homebridge
 * @param {object} homebridge Export functions required to create a
 *                            new instance of this plugin.
 */
module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-http-rgb', 'HTTP-RGB', HTTP_RGB);
};

/**
 * Parse the config and instantiate the object.
 *
 * @summary Constructor
 * @constructor
 * @param {function} log Logging function
 * @param {object} config Your configuration object
 */
function HTTP_RGB(log, config) {

    // The logging function is required if you want your function to output
    // any information to the console in a controlled and organized manner.
    this.log = log;

    this.service     = 'Light';
    this.name        = config.name;
    this.duration    = config.duration || 1000;

    this.username    = config.username || '';
    this.password    = config.password || '';

    // Handle the basic on/off
    this.switch = { powerOn: {}, powerOff: {} };
    if (typeof config.switch === 'object') {
        this.switch.url = config.switch.url;
    }

    // Local caching of HSB color space for RGB callback
    this.cache = {};

    // Handle brightness
    if (typeof config.brightness === 'object') {
        this.brightness          = {};
        this.brightness.url      = config.brightness.url;
        this.cache.brightness    = 0;
    } else {
        this.brightness = false;
        this.cache.brightness = 100;
    }

    // Color handling
    if (typeof config.color === 'object') {
        this.color               = {};
        this.color.url           = config.color.url;
        this.color.brightness    = config.color.brightness;
        this.cache.hue           = 0;
        this.cache.saturation    = 0;
    } else {
        this.color = false;
    }

    this.has = { brightness: this.brightness || (typeof this.color === 'object' && this.color.brightness) };

}

/**
 *
 * @augments HTTP_RGB
 */
HTTP_RGB.prototype = {

    /** Required Functions **/
    identify: function(callback) {
        this.log('Identify requested!');
        callback();
    },

    getServices: function() {
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Kevin Murphy')
            .setCharacteristic(Characteristic.Model, 'RGB LED Strip')
            .setCharacteristic(Characteristic.SerialNumber, '1337');

        switch (this.service) {
            case 'Light':
                this.log('creating Lightbulb');
                var lightbulbService = new Service.Lightbulb(this.name);

                if (this.switch.url) {
                    lightbulbService
                        .getCharacteristic(Characteristic.On)
                        .on('get', this.getPowerState.bind(this))
                        .on('set', this.setPowerState.bind(this));
                }

                // Handle brightness
                if (this.has.brightness) {
                    this.log('... adding Brightness');
                    lightbulbService
                        .addCharacteristic(new Characteristic.Brightness())
                        .on('get', this.getBrightness.bind(this))
                        .on('set', this.setBrightness.bind(this));
                }
                // Handle color
                if (this.color) {
                    this.log('... Ted Turnerizing(tm)');
                    lightbulbService
                        .addCharacteristic(new Characteristic.Hue())
                        .on('get', this.getHue.bind(this))
                        .on('set', this.setHue.bind(this));

                    lightbulbService
                        .addCharacteristic(new Characteristic.Saturation())
                        .on('get', this.getSaturation.bind(this))
                        .on('set', this.setSaturation.bind(this));
                }

                this._debounceRGB = _.debounce(this._setRGB, 100);

                return [lightbulbService, informationService];

            default:
                return [informationService];

        } // end switch
    },

    /**
     * Gets power state of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getPowerState: function(callback) {
        if (!this.switch.url) {
            this.log.warn('Ignoring request, switch.url not defined.');
            callback(new Error('No switch.url url defined.'));
            return;
        }

        this._httpRequest(this.switch.url, '', 'GET', function(error, response, responseBody) {
            if (error) {
                this.log('getPowerState() failed: %s', error.message);
                callback(error);
            } else {
                var powerOn = parseInt(responseBody) > 0;
                this.log('power is currently %s', powerOn ? 'ON' : 'OFF');
                callback(null, powerOn);
            }
        }.bind(this));
    },

    /**
     * Sets the power state of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setPowerState: function(state, callback) {
        if (!this.switch.url) {
            this.log.warn('Ignoring request, switch.url is not defined.');
            callback(new Error("The 'switch' section in your configuration is incorrect."));
            return;
        }

        var body = { "value": state ? "on" : "off", "duration": this.duration };

        this._httpRequest(this.switch.url, body, "POST", function(error, response, responseBody) {
            if (error) {
                this.log('setPowerState() failed: %s', error.message);
                callback(error);
            } else {
                this.log('setPowerState() successfully set to %s', state ? 'ON' : 'OFF');
                callback(undefined, responseBody);
            }
        }.bind(this));
    },

    /**
     * Gets brightness of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getBrightness: function(callback) {
        if (!this.has.brightness) {
            this.log.warn("Ignoring request; No 'brightness' defined.");
            callback(new Error("No 'brightness' defined in configuration"));
            return;
        }

        if (this.brightness) {
            this._httpRequest(this.brightness.url, '', 'GET', function(error, response, responseBody) {
                if (error) {
                    this.log('getBrightness() failed: %s', error.message);
                    callback(error);
                } else {
                    var level = parseInt(responseBody);
                    this.log('brightness is currently at %s %', level);
                    this.cache.brightness = level;
                    callback(null, level);
                }
            }.bind(this));
        } else {
            callback(null, this.cache.brightness);
        }
    },

    /**
     * Sets the brightness of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setBrightness: function(level, callback, test) {
        if (!this.has.brightness) {
            this.log.warn("Ignoring request; No 'brightness' defined.");
            callback(new Error("No 'brightness' defined in configuration"));
            return;
        }
        this.cache.brightness = level;

        // If achromatic, then update brightness, otherwise, update HSL as RGB
        if (!this.color) {
            var body = { "value": level, "duration": this.duration };

            this._httpRequest(this.brightness.url, body, "POST", function(error, response, body) {
                if (error) {
                    this.log('setBrightness() failed: %s', error);
                    callback(error);
                } else {
                    this.log('setBrightness() successfully set to %s %', level);
                    callback();
                }
            }.bind(this));
        } else {
            if (test) {
              callback(undefined, this._setRGB(true, "brightness"));
            } else {
              this._debounceRGB();
              callback();
            }
        }
    },

    /**
     * Gets the hue of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getHue: function(callback) {
        if (this.color && typeof this.color.url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }

        this._httpRequest(this.color.url, '', 'GET', function(error, response, responseBody) {
            if (error) {
                this.log('... getHue() failed: %s', error.message);
                callback(error);
            } else {
                var hue = Math.round(chroma(
                    parseInt(responseBody.substr(0,2),16),
                    parseInt(responseBody.substr(2,2),16),
                    parseInt(responseBody.substr(4,2),16)
                ).get("hsv.h")) || 0;

                this.log('... hue is currently %s', hue);
                this.cache.hue = hue;
                callback(null, hue);
            }
        }.bind(this));
    },

    /**
     * Sets the hue of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setHue: function(level, callback, test) {
        if (this.color && typeof this.color.url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        this.log('Caching Hue as %s ...', level);
        this.cache.hue = level;

        if (test) {
          callback(undefined, this._setRGB(true, "hue"));
        } else {
          this._debounceRGB();
          callback();
        }
    },

    /**
     * Gets the saturation of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getSaturation: function(callback) {
        if (this.color && typeof this.color.url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }

        this._httpRequest(this.color.url, '', 'GET', function(error, response, responseBody) {
            if (error) {
                this.log('... getSaturation() failed: %s', error.message);
                callback(error);
            } else {
                var saturation = Math.round(chroma(
                    parseInt(responseBody.substr(0,2),16),
                    parseInt(responseBody.substr(2,2),16),
                    parseInt(responseBody.substr(4,2),16)
                ).get("hsv.s") * 100);

                this.log('... saturation is currently %s', saturation);
                this.cache.saturation = saturation;
                callback(null, saturation);
            }
        }.bind(this));
    },

    /**
     * Sets the saturation of the lightbulb.
     *
     * @param {number} level The saturation of the new call.
     * @param {function} callback The callback that handles the response.
     */
    setSaturation: function(level, callback, test) {
        if (this.color && typeof this.color.url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        this.log('Caching Saturation as %s ...', level);
        this.cache.saturation = level;

        if (test) {
          callback(undefined, this._setRGB(true, "saturation"));
        } else {
          this._debounceRGB();
          callback();
        }
    },

    /**
     * Sets the RGB value of the device based on the cached HSB values.
     *
     * @param {function} callback The callback that handles the response.
     */
    _setRGB: function(test, type) {
        var hex = chroma(this.cache.hue, this.cache.saturation / 100, this.cache.brightness / 100, 'hsv').hex().replace('#', '');
        this.log('_setRGB converting H:%s S:%s B:%s to RGB:%s ...', this.cache.hue, this.cache.saturation, this.cache.brightness, hex);

        var body = { "value": hex, "duration": this.duration };

        this._httpRequest(this.color.url, body, "POST", function(error, response, body) {
            if (error) {
                this.log('... _setRGB() failed: %s', error);
            } else {
                this.log('... _setRGB() successfully set to #%s', hex);
            }
        }.bind(this));

        // When running tests, this function should return cached values
        if (test) {
            var result;
            switch (type) {
                case "hue":
                    result = this.cache.hue;
                    break;
                case "saturation":
                    result = this.cache.saturation;
                    break;
                default:
                    result = this.cache.brightness;
                    break;
            }

            return result;
        }
    },

    /** Utility Functions **/
    /**
     * Perform an HTTP request.
     *
     * @param {string} url URL to call.
     * @param {string} body Body to send.
     * @param {method} method Method to use.
     * @param {function} callback The callback that handles the response.
     */
    _httpRequest: function(url, body, method, callback) {
        request({
            url: url,
            json: body,
            method: method,
            rejectUnauthorized: false,
            auth: {
                user: this.username,
                pass: this.password
            }
        },
        function(error, response, body) {
            callback(error, response, body);
        });
    }

};