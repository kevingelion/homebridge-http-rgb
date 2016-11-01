# homebridge-http-rgb

Supports RGB http(s) devices on the HomeBridge Platform and provides a readable
callback for getting and setting the following characteristics to Homekit:

* Characteristic.On
* Characteristic.Brightness
* Characteristic.Hue
* Characteristic.Saturation


# Installation

1. Install homebridge using: `npm install -g homebridge`
2. (Temporarily) Install homebridge-http from this repo from **one directory up** : `npm install -g homebridge-http-rgb/`
3. Update your configuration file.  See below for examples.


# Configuration

## Examples

### Full RGB Device

    "accessories": [
        {
            "accessory": "HTTP-RGB",
            "name": "RGB Led Strip",

            "switch": {
                "url": "http://localhost/api/v1/status"
            },

            "brightness": {
                "url": "http://localhost/api/v1/brightness"
            },

            "color": {
                "url": "http://localhost/api/v1/color"
                "brightness": true
            }
        }
    ]

### Single Color Light that only turns "off" and "on"

    "accessories": [
        {
            "accessory": "HTTP-RGB",
            "name": "Single Color Light",

            "switch": {
                "url": "http://localhost/api/v1/status"
            }
        }
    ]

### Single Color Light with Brightness

    "accessories": [
        {
            "accessory": "HTTP-RGB",
            "name": "Single Color Light",

            "switch": {
                "url": "http://localhost/api/v1/status"
            },

            "brightness": {
                "url": "http://localhost/api/v1/brightness"
            }
        }
    ]

### RGB Light without Brightness

    "accessories": [
        {
            "accessory": "HTTP-RGB",
            "name": "Single Color Light",

            "switch": {
                "url": "http://localhost/api/v1/status"
            },

            "color": {
                "url": "http://localhost/api/v1/color"
            }
        }
    ]

This normally will not occur, however, you may not want your application to
display a "brightness" slider to the user.  In this case, you will want to
remove the brightness component from the config.


# Interfacing

All of the urls expect a 200 HTTP status code and a body of a single string with no HTML markup. The URLs for each interface are used for both setting and getting values. Detailed below are what the URLs should return or accept.

## GET
* `GET` `switch.url` should return `0` for Off, and `1` for On.
* `GET` `brightness.url` should return a number from `0` to `100`.
* `GET` `color.url` should return a 6-digit hexidemial number.

## POST

Setting values requires sending a POST request to the specified URL. The web server endpoints should accept a POST request with a body structured like so:
```
{
  "value": [actual value]
}
```

Since each URL is specific to the parameter you're adjusting, that can be used as the identifier so the body simply just includes the new value of whatever you're changing.

A simple setup for an Express 4.0 route would look like this (where name can be `color`, `brightness`, or `status`):
```
router.post('/api/v1/:name', function(req, res, next) {
}
```

# Testing
A simple test has been written using Express and Mocha. You can use these tests directly or using `Grunt`. You can easily test your developments by running any of the below. Note running `grunt` by itself will call JSHint and the Mocha tests. 
```
grunt
```
```
grunt test
```
```
grunt lint
```

# Common Issues
This package, and homebridge in general, require Avahi. If you see any issues regarding mdns installation on Linux, please make sure you have `lilavahi` installed. It may take a `sudo apt-get update` to pull the package.
```
sudo apt-get update
sudo apt-get install libavahi-compat-libdnssd-dev
```
