#!/usr/bin/env node
/*modules: math.njs*/

"use strict";

var math = require('./math.njs'),
    fs = require('fs');

exports.clone = function clone (o, keys, def) {
	if (!o || typeof o !== 'object')
		return o;
	var c = o instanceof Array? [] : {};
	if (keys) {
		keys = keys.split(',');
		for (var i = 0, length = keys.length; i < length; ++i) {
			var key = keys[i];
			if (key in o)
				c[key] = clone(o[key]);
			else if (def)
				c[key] = clone(def.value);
		}
	} else {
		for (var p in o) {
			if (o.hasOwnProperty(p)) {
				var v = o[p];
				if (v && typeof v === 'object')
					c[p] = clone(v);
				else
					c[p] = v;
			}
		}
	}
	return c;
};

exports.getLast = function getLast(arr) {
	var length = arr.length;
	if (!length)
		return undefined;
	return arr[arr.length - 1];
};

exports.interval = function interval(arr, from, to) {
	return arr.filter(function (o) {return to === undefined ? o.x >= from :  o.x >= from && o.x <= to;});
};

exports.intervalCenter = function inttervalCenter (str) {
	str = str.split('-');
	return math.mean(+str[0], +(str[1] || str[0]) + 1);
};

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

exports.isNumeric = isNumeric;

exports.isNonNegativeNumber = function isNonNegativeNumber (v) {
	return isNumeric(v) && v >=0;
};

exports.join =  function join (self, obj) {
	for (var nm in obj)
		self[nm] = obj[nm];
	return self;
};

exports.joiny =  function joiny (self, obj) {
	for (var nm in obj)
		if (!(nm in self))
			self[nm] = obj[nm];
	return self;
};

exports.ratesByAge = function ratesByAge (obj) {// Move to mortality modules
	var res = [];
	for (var key in obj) {
		if (isNumeric(key))
			res.push({x: 0.5 + (+key), y: isNumeric(obj[key]) ? +obj[key] : 0});
		else if(key.match(/^\d+-?\d*$/)) {
			var tmp = key.split('-');
			res.push({x: (tmp.reduce(function (x, y) {return (+x) + (+y);}, 1))/ tmp.length, y: isNumeric(obj[key]) ? +obj[key] : 0});
		}
	}
	return res;
};

exports.readConfig = function readConfig (path, delimeter, encoding) { //Deprecated
	var list = fs.readFileSync(path,{encoding: encoding || 'utf8'}),
	    fields,
	    config = {};
	list = list.split('\n').filter(function (x) {return x;});
	fields = list[0].split(delimeter);
	list.shift();
	if (list.length > 1)
		while (list.length) {
			var tmp = toObj(fields, list[0].split(delimeter));
			config[tmp.index] = tmp;
			delete tmp.index;
			list.shift();
		}
	else {
		config = toObj(fields, list[0].split(delimeter));
		delete config.index;
	}
	return config;
};

exports.represent = function represent (o) {
	function _printObj (o, i) {
		var bounds, res = [], n = i || 0, del = ['\n'];
		++n;
		if (o instanceof Array) {
			bounds = ['[', ']'];
		} else if (typeof o === 'object') {
			bounds = ['{', '}'];
		} else {
			return o;
		}
		res.push(bounds[0]);
		for (var key in o) {
			var tmp = o[key];
			res.push([key, tmp === 'object' ? _printObj(tmp, n) : tmp].join(': '));
		}
		res.push(bounds[1]);
		while (n-- > 0) {
			del.push('\t');
		}
		return res.join(del.join(''));
	}
	return _printObj(o, 0);
};

exports.roundFields = function roundFields (values, positions) {
	for (var key in values) {
		var tmp = math.round(values[key], positions[key] || 1);
		if (tmp)
			values[key] = tmp;
	}
	return values;
};

exports.saveSuccess = function saveSuccess (o) { //Deprecated
	var order = {A: 1, R: 2, B: 3, C: 4},
	str = [];
	for (var key in o) {
		if (!order[key])
			continue;
		str.push([key, o[key]].join(':'));
	}
	str.sort(function (a, b) {
		a = order[a.split(':')[0]];
		b = order[b.split(':')[0]];
		return a - b;
		}).join(',');
	return str ? ['{', str, '}'].join('') : undefined;
};

exports.selectMin = function selectMin (arr, key) { //Deprecated
	arr.sort(function (a, b) { return (a[key] || 0) - (b[key] || 0)});
	return arr[0];
};

exports.toArrays = function toArrays (arr) {
	var x = [], y =[];
	for (var i = 0, length = arr.length; i < length; ++i) {
		var tmp = arr[i];
		x.push(tmp.x);
		y.push(tmp.y);
	}
	return {x: x, y: y};
};

function toObj (keys, values, delimeter) {//Deprecated
	if (typeof values === 'string')
		values = values.split(delimeter);
	var obj = {};
	for (var i = 0, length = Math.min(keys.length, values.length); i < length; ++i) {
		var value = values[i];
		obj[keys[i]] = isNumeric(value) ? +value : value;
	}
	return obj;
}

exports.toObj = toObj;