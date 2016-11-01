// Generate Config
var config = function(port) {
    return {
        "name": "Test Accessory",
        "switch": {
            "url": "http://localhost:"+port+"/api/v1/status"
        },
        "brightness": {
            "url": "http://localhost:"+port+"/api/v1/brightness"
        },
        "color": {
            "url": "http://localhost:"+port+"/api/v1/color",
            "brightness": true
        }
    };
};

// Set up environment
var device = require('./device.js')();
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var plugin = require('../index.js');

// Test Switch Accessory
var homebridge = require('./homebridge.js')(new config(device.port));
plugin(homebridge);
my = homebridge.accessory;
var services = my.getServices();

describe("HTTP-RGB Accessory", function() {
    describe("constructor", function() {
        it("should have a name", function() {
            expect(my.name).to.equal("Test Accessory");
        });

        it("should have Characteristics", function() {
            expect(services).to.include.something.that.has.property('characteristics').that.includes.something;  // jshint ignore:line
        });

        it("should have Characteristic 'On'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'On');
        });

        it("should have Characteristic 'Brightness'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Brightness');
        });

        it("should have Characteristic 'Hue'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Hue');
        });

        it("should have Characteristic 'Saturation'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Saturation');
        });
    });

    describe("switch", function() {
        it("getPowerState", function(done) {
            my.getPowerState(function(err, val) { expect(val).to.equal(false); done(); });
        });

        it("setPowerState: true", function(done) {
            my.setPowerState(true, function(err, val) { expect(err).to.equal(undefined); expect(val.toString()).to.equal("1"); done(); });
        });

        it("setPowerState: false", function(done) {
            my.setPowerState(false, function(err, val) { expect(err).to.equal(undefined); expect(val.toString()).to.equal("0"); done(); });
        });
    });

    describe("color", function() {
        it("getBrightness: 0", function(done) {
            my.getBrightness(function(err, val) { expect(val.toString()).to.equal("0"); done(); });
        });

        it("getSaturation: 0", function(done) {
            my.getSaturation(function(err, val) { expect(val.toString()).to.equal("0"); done(); });
        });

        it("getHue: 0", function(done) {
            my.getHue(function(err, val) { expect(val.toString()).to.equal("0"); done(); });
        });

        it("setBrightness: 100", function(done) {
            my.setBrightness(100, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal(100); done(); }, true);
        });

        it("setSaturation: 100", function(done) {
            my.setSaturation(100, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal(100); done(); }, true);
        });

        it("setHue: 180", function(done) {
            my.setHue(180, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal(180); done(); }, true);
        });

        it("getBrightness: 100", function(done) {
            my.getBrightness(function(err, val) { expect(val.toString()).to.equal("100"); done(); });
        });

        it("getSaturation: 100", function(done) {
            my.getSaturation(function(err, val) { expect(val.toString()).to.equal("100"); done(); });
        });

        it("getHue: 180", function(done) {
            my.getHue(function(err, val) { expect(val.toString()).to.equal("180"); done(); });
        });
    });
});
