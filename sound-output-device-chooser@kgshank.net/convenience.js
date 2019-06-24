/*******************************************************************************
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/
 /* jshint moz:true */

const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang;
const Me = ExtensionUtils.getCurrentExtension();
const Prefs = Me.imports.prefs;

var DEBUG = false;
var _settings = null;

/**
 * getSettings:
 *
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for
 * @schema, using schema files in extensions dir/schemas. If
 * @schema is not provided, it is taken from metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a sub-folder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),GioSSS.get_default(),false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                + extension.metadata.uuid + '. Please check your installation.');

    _settings = new Gio.Settings({ settings_schema: schemaObj });
    return _settings;
}

let cards;
function getProfiles(control, uidevice)
{
    let stream = control.lookup_stream_id(uidevice.get_stream_id());
    if(stream) {
        if(!cards || Object.keys(cards).length == 0 || !cards[stream.card_index]) {
            refreshCards();
        }

        if(cards && cards[stream.card_index]) {
            log("Getting profile form stream id " + uidevice.port_name );
        	return getProfilesForPort(uidevice.port_name, cards[stream.card_index]);
        }
    }
    else
    {
        /* Device is not active device, lets try match with port name */
        refreshCards();
        for (let id in cards) {
            let profiles;
            log("Getting profile from cards " + uidevice.port_name  + " for card id " + id);
            if((profiles = getProfilesForPort(uidevice.port_name, cards[id])))
            {
                return profiles;
            }
        }
    }

    return null;
}

let ports;
function getPorts(refresh) {
    if(!ports || ports.length == 0 || refresh) {
        refreshCards();
    }
    return ports;
}

function refreshCards() {
	cards = {};
    ports = [];
	if(_settings == null) {getSettings(Prefs.SETTINGS_SCHEMA);}
	let error = false;
    if(_settings.get_boolean(Prefs.NEW_PROFILE_ID))	{
    	log("New logic");
    	let pyLocation =  Me.dir.get_child('utils/pa_helper.py').get_path();
    	try {
	    	let [result, out, err, exit_code] = GLib.spawn_command_line_sync('python ' + pyLocation);
	    	//log("result" + result +" out"+out + " exit_code" + exit_code + " err" +err);
	    	if(result && !exit_code) {
	    		let obj =  JSON.parse(ByteArray.toString(out));
	    		cards = obj['cards'];
	    		ports = obj['ports'];
		    }
    	}
    	catch(e) {
    		error = true;
    		log('ERROR: Python execution failed. fallback to default mode');
    		_settings.set_boolean(Prefs.NEW_PROFILE_ID, false);
    		Gio.Settings.sync();
    	}
    }

    if(!_settings.get_boolean(Prefs.NEW_PROFILE_ID) || error){
    	try {
    		let [result, out, err, exit_code] = GLib.spawn_command_line_sync('pactl list cards');
    		if(result && !exit_code) {
    			parseOutput(out);
    		}
    	}
	    catch(e) {
    		log('ERROR: pactl execution failed. No ports/profiles will be displayed');
    	}
    }
//    log(JSON.stringify(cards));
//	log(JSON.stringify(ports));

}

function parseOutput(out) {
    let lines;
    if (out instanceof Uint8Array) {
        lines = ByteArray.toString(out).split('\n');
    } else {
        lines = out.toString().split('\n');
    }

    let cardIndex;
    let parseSection = "CARDS";
    let port;
    let matches;
    // log("Unmatched line:" + out);
    while(lines.length > 0) {
        let line = lines.shift();

        if( (matches = /^Card\s#(\d+)$/.exec(line) )) {
            cardIndex = matches[1];
            if(!cards[cardIndex]) {
                cards[cardIndex] = {'index':cardIndex,'profiles':[], 'ports':[]};
            }
        }
        else if (line.match(/^\t*Profiles:$/) ) {
            parseSection = "PROFILES";
        }
        else if (line.match(/^\t*Ports:$/)) {
            parseSection = "PORTS";
        }
        else if(cards[cardIndex]) {
            switch(parseSection) {
                case "PROFILES":
                    if((matches = /.*?((?:output|input)[^+]*?):\s(.*?)\s\(sinks:/.exec(line))) {
                        cards[cardIndex].profiles.push({'name': matches[1], 'human_name': matches[2]});
                    }
                    break;
                case "PORTS":
                    if((matches = /\t*(.*?):\s(.*?)\s\(priority:/.exec(line))) {
                        port = {'name' : matches[1], 'human_name' : matches[2]};
                        cards[cardIndex].ports.push(port);
                        ports.push({'name' : matches[1], 'human_name' : matches[2]});
                    }
                    else if( port && (matches = /\t*Part of profile\(s\):\s(.*)/.exec(line))) {
                        let profileStr = matches[1];
                        port.profiles = profileStr.split(', ');
                        port = null;
                    }
                    break;
            }
        }
    }
}

var Signal = class Signal {

    constructor(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    }

    connect() {
        this._signalId = this._signalSource.connect(this._signalName, this._signalCallback);
    }

    disconnect() {
        if(this._signalId) {
            this._signalSource.disconnect(this._signalId);
            this._signalId = null;
        }
    }
}

var SignalManager = class SignalManager {
    constructor() {
        this._signals = [];
        this._signalsBySource = {};
    }

    addSignal(signalSource, signalName, callback) {
	let obj = null;
	if(signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();
            this._signals.push(obj);
            let sourceSignals = this._signalsBySource[signalSource]
            if(!sourceSignals) {
            	sourceSignals = [];
            	this._signalsBySource[signalSource] = sourceSignals;
            }
            //this._signalsBySource[signalSource].push(obj)
            sourceSignals.push(obj);
        }
		return obj;
    }

    disconnectAll() {
    	for (let signal of this._signals){
    		signal.disconnect();
    	}
    }

    disconnectBySource(signalSource) {
    	if(this._signalsBySource[signalSource]) {
    		for (let signal of this._signalsBySource[signalSource]) {
    			signal.disconnect();
    		}
        }
    }
}


function getProfilesForPort(portName, card) {
    if(card.ports) {
        for (let port of card.ports) {
            if(portName === port.name) {
                let profiles = [];
                if (port.profiles) {
                    for (let profile of port.profiles) {
                        if(profile.indexOf('+input:') == -1) {
                            for (let cardProfile of card.profiles) {
                                if(profile === cardProfile.name) {
                                    profiles.push(cardProfile);
                                }
                            }
                        }
                    }
                }
                return profiles;
            }
        }
    }
    return null;
}

function setLog(value) {
	DEBUG = value;
}

function log(msg) {
    if ( DEBUG == true ) {
      global.log(msg);
    }
}
