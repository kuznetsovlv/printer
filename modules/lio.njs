#!/usr/bin/env node
/*modules: util.njs math.njs*/
(function () {
	"use strict"
	var fs = require('fs'),
	    util = require('./util.njs');

	function Reader (options) {
		/*Private*/
		var length = 1024,
		    p = -1,
		    encoding = options.encoding || 'utf8',
		    lines = [],
		    path = options.path;
		try {
			var fd = fs.openSync(path, 'r');
		} catch (e) {
			throw path ? ['Can not open file', path].join(' ') : 'Input file not specified';
		}

		lines.getLast = function getLast () {
			return this[this.length - 1];
		}
		lines.pushPosition = function pushPosition (v) {
			return this.push(++v + (this.getLast() || 0));
		}
		
		function _getPos (line) {
			var length = lines.length;
			if (!length)
				return {position: 0, line: 0};
			if (line < length)
				return {position: lines[line - 1] || 0, line: line};
			return {position: lines.getLast(), line: length};
		}
		function _line (position) {
			function __length(p, l) {
				return p < 0 ? l : p;
			}
			var buffer = new Buffer(length),
			    l = fs.readSync(fd, buffer, 0, length, position);
			if (!l) {
				lines.push(0);
				return undefined;
			}
			var str = buffer.toString(encoding);
			p = str.search('\n');
			if (p < 0 && l === length) {
				length *= 2;	
				return _line(position);
			} else {
				p = __length(p, l);
				if (!lines.length || lines.getLast() <= position)
					lines.pushPosition(p);
				if (p === l)
					lines.push(0);
			}
			length = Math.round(lines.getLast() / lines.length) || 8;
			return str.substr(0, p).replace(/\r|\n/g,'');
		}

		/*Public*/
		this.delimeter = options.delimeter || ',';

		this.getLine = function getLine (n) {
			var pos = _getPos(n), line;
			if (!pos.position && pos.line)
				return undefined;
			n -= pos.line;
			pos = pos.position;
			++n;
			while (n-- && ((line = _line(pos)) !== undefined)) {
				pos = lines.getLast();
			}
			return line;
		};

		this.getHeader = function getHeader () {
			if (!this.header)
				Object.defineProperty(this, 'header', {value: this.getLine(0).split(this.delimeter), writable: false, enumerable: true, configurable: false});
			return this.header;
		}

		this.getValues = function getValues (n) {
			var line = this.getLine(n),
			    values = {},
			    header = this.header || this.getHeader();
			if (line !== undefined)
				line = line.split(this.delimeter);
			else
				return undefined;
			for (var i = 0, l = Math.min(header.length, line.length); i < l; ++i) {
				var value = line[i];
				values[header[i]] = util.isNumeric(value) ? parseFloat(value) : value;
			}
			return values;
		}
		this.close = function close () {
			fs.closeSync(fd);
		}
		this.open = function open () {
			fd = fs.openSync(path, 'r');
		}
	}

	function Output (options) {
		/*Private*/
		var _print,
		    path = options.path;
		switch (path) {
			case 1: _print = function (str) {return console.log(str);}; break;
			case 2: _print = function (str) {return console.error(str);}; break;
			default:
				var _clear = function _clear () {
					if (fs.existsSync(path))
						fs.unlinkSync(path);
				}
				if (!options.append)
					_clear();
				var encoding = options.encoding || 'utf8';
				var fd = fs.openSync(path, 'a');
				_print = function (str) {
					var buffer = new Buffer(str, encoding);
					return fs.writeSync(fd, buffer, 0, str.length);
				};
				this.close = function close () {
					fs.closeSync(fd);
					return this;
				}
				this.open = function open () {
					fd = fs.openSync(path, 'a');
					return this;
				}
				this.clearPath = function clearPath () {
					_clear();
					return this;
				}
				break;
		}

		/*Public*/
		this.delimeter = options.delimeter || ',';
		this.setHeader = function  setHeader (header) {
			if (typeof header === 'string')
				header = header.split(this.delimeter);
			if (!(header instanceof Array))
				throw "Incorrect header";
			Object.defineProperty(this, 'header', {value: header, writable: false, enumerable: true, configurable: false});
			delete this.setHeader;
			return this;
		}
		this.printHeader = function printHeader () {
			if (!this.header)
				throw "No header"
			delete this.printHeader;
			return this.printLine(this.header);
		};
		this.printText = function printText (text) {
			return _print(text);
		};
		this.printLine = function printLine (line) {
			if (line instanceof Array)
				line = line.join(this.delimeter);
			switch (typeof line) {
				case 'object': return this.printData(line); break;
				case 'boolean': 
				case 'number': line = [line, ''].join('');
				case 'string': _print(line); if (![false, true, true][path] && line.substr(-1) !== '\n') _print('\n'); break;
				default: return _print('\n');
			}
		}
		this.printData = function printData (data) {
			var line = [], header = this.header;
			if (header) {
				for (var i = 0, l = header.length; i < l; ++i) {
					var key = header[i];
					line.push( key in data ? data[key] : '');
				}
			} else {
				for (var key in data)
					line.push(data[key]);
			}
			return this.printLine(line);
		}
		this.reset = function reset () {
			return new Output(options);
		}

	}

	function LIO (flows) {
		if (!(flows instanceof Array))
			flows = [flows];
		var inputs = [],
		    ouputs = [];
		for (var i = 0, l = flows.length; i < l; ++i) {
			var flow = flows[i],
			    f;
			switch (flow.type) {
				case 'input': f = new Reader(flow); inputs.push(f); break;
				case 'output':
					/*if (!f.append && !{1: true, 2: true}[f.path]) {
						var fs = require('fs');
						if (fs.existsSync(f.path))
							fs.unlinkSync(f.path);
					}*/
					f = new Output(flow), ouputs.push(f);
					break;
				default: continue; break;
			}
			if (flow.name)
				this[flow.name] = f;
		}
		this.getFlow = function getFlow (flow, type) {
			if (!type || typeof flow === 'string')
				return this[flow];
			switch (type) {
				case 'input': return inputs[flow]; break;
				case 'output': return ouputs[flow]; break;
			}
			return undefined
		}
	}

	exports.getLIO = function (flows) {return new LIO(flows); };
	exports.getNamedLIO = function (flows) {
		var arr = [];
		for (var key in flows) {
			var flow = flows[key];
			flow.name = key;
			arr.push(flow);
		}
		return new LIO(arr);
	}
})()
