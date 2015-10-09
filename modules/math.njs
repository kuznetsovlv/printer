#!/usr/bin/env node
/*modules: util.njs*/

"use strict";

var util = require('./util.njs'),
    math = require('./math.njs');

var options = {
	errors: {
		calcErr: 'Calculation Error:',
		dataErr: 'Invalid data array!',
		matrixErr: 'Wrong matrix!',
		paramErr: 'Invalid parameter!',
		inputErr: 'Incorrect theoretical data input!',
		eqWrong: 'Wrong equation!'
	},
	tests: {

	},
	dC_pow: 2,
	zeroln: 0.1,
};

function calculation (value, func) {
	var result = {};
	if (value instanceof Object)
		result = value;
	else if (util.isNumeric(value))
		result.x = +value;
	else
		throw options.errors.paramErr;
	try {
		result.y_theor = func(result.x);
	} catch (err) {
		throw [options.errors.calcErr, err]. join(' ');
	}
	return result;
}

exports.calculation = calculation;

function determinant (matrix) {
	var size = matrix.length,
	    m = [],
	    result = 0;
	if (!size || !(matrix instanceof Array)) {
		if (util.isNumeric(matrix))
			return +matrix;
		else
			throw options.errors.matrixErr;
	}
	if (size === 1)
		return determinant(matrix[0]);
	for (var i = 0; i < size; ++i)
		if (matrix[i].length !== size)
			throw options.errors.matrixErr;
	for (var i = 0; i < size; ++i) {
		var row = [];
		for (var j = 1; j < size; ++j) {
			for (var k = 0; k < size; ++k) {
				if (k === i)
					continue;
				row.push(matrix[j][k]);
			}
			m.push(row);
			row = [];
		}
		result += Math.pow(-1, i) * matrix[0][i] * determinant(m);
		m = [];
	}
	return result;
}

exports.determinant = determinant;

exports.lb = function lg (v) {
	return Math.log(v) / Math.log(2);
}

exports.lg = function lg (v) {
	return Math.log(v) / Math.log(10);
}

exports.ln = function lg (v) {
	return Math.log(v);
}

exports.log = function log (v, p) {
	return Math.log(v) / Math.log(p);
}

exports.mean = function mean() {
	var sum = 0,
	    length = arguments.length;
	for (var i = 0; i < length; ++i)
		sum += arguments[i];
	return sum / length;
}

exports.product = function product (x, y) {
	var length = Math.max(x.length, y.length),
	    result = [];
	for (var i = 0; i < length; ++i)
		result.push(x[i] * y[i]);
	return result;
}

exports.round = function round (value, to) {
	return Math.round(value * Math.pow(10, -math.lg(to))) * to;
}

exports.sigma = function sigma(data, func) {
	var length = data.length,
	    result = 0;
	if ((typeof data === 'object') && !(data instanceof Array))
		result = func ? Math.abs(data.y - func(data.x)) : Math.abs(data.y - data.y_theor);
	else if (length) {
		for (var i = 0; i < length; ++i) {
			var d = data[i];
			result += func ? Math.pow((d.y - func(d.x)), 2) : Math.pow((d.y - d.y_theor), 2);
		}
		result /= length;
	} else
		throw options.errors.dataErr;
	/*if (!util.isNumeric(result))
		throw options.errors.dataErr;*/
	return Math.sqrt(result);
}

exports.theorVals = function theorVals (values, func) {
	var params = [];
	if (!(values instanceof Array))
		params.push(values);
	else
		params = values;
	var i = 0,
	    length = params.length,
	    result = [],
	    errors = [];
	while (i < length) {
		try {
			result.push(calculation(params[i], func));
		} catch (err) {
			errors.push(err);
		}
		++i;
	}
	if (!result.length)
		throw [options.errors.dataErr].concat(errors).join('\n');
	return result;
};


	/*Spetial Functions*/
function Approximation (data, method) {
	var parabola = method.toLowerCase() === 'parabola';
	var x = [],
	    y = [],
	    xx = [],
	    length = data.length;
	if (!length || length < 5 || !(data instanceof Array))
		throw ['Incorect data:', data].join('\n');
	for (var i = 0; i < length; ++i) {
		var x_ = data[i].x,
		    y_ = data[i].y;
		if (y_ && y_ > 0) {
			x.push(x_);
			y.push(Math.log(y_));
			xx.push(Math.pow(x_, 2));
		}
	}
	var mx = math.mean.apply(math, x),
	    my = math.mean.apply(math, y),
	    mx2 = math.mean.apply(math, xx),
	    mxy = math.mean.apply(math, math.product(x, y)),
	    det, detA, detR;
	function powArr(arr, pow) {
		var tmp = util.clone(arr);
		tmp.forEach(function (x, i, arr) {arr[i] = Math.pow(x, pow);})
		return tmp;
	}
	if (parabola) {
		var mx3 = math.mean.apply(math, powArr(x, 3)),
		    mx4 = math.mean.apply(math, powArr(xx, 2)),
		    mx2y = math.mean.apply(math, math.product(xx, y)),
		    detB = determinant([[1, mx, my], [mx, mx2, mxy], [mx2, mx3, mx2y]]);
		}
		switch (method.toLowerCase()) {
			case 'hompertz': 
				det = determinant([[1, mx], [mx, mx2]]);
				detA = determinant([[1, my], [mx, mxy]]);
				detR = determinant([[my, mx], [mxy, mx2]]);
				break;
			case 'parabola':
				det = determinant([[1, mx, mx2], [mx, mx2, mx3], [mx2, mx3, mx4]]);
				detA = determinant([[1, my, mx2], [mx, mxy, mx3], [mx2, mx2y, mx4]]);
				detR = determinant([[my, mx, mx2], [mxy, mx2, mx3], [mx2y, mx3, mx4]]);
				break;
			default: throw 'Unknown approximation method';
		}
	if (!det)
		throw "No solution or infinit number of the solutions";
	this.A = detA / det;
	if (parabola)
		this.B = detB / det;
	this.R = Math.exp(detR / det);
}
/*Covers*/
	 function hompertz (data) {
		return new Approximation(data,'Hompertz');
	};
	function parabola (data) {
		return new Approximation(data,'Parabola');
	};

exports.hompertz = hompertz;
exports.parabola = parabola;

