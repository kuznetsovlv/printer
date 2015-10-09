#!/usr/bin/env nodejs

(function () {
	"use strict"
	var pwd = '/root/.cronscripts/printer'/*.*/;
	var p = require('path');
	var lio = require('./modules/lio.njs').getLIO([
		{
			name: 'rlast',
			path: p.normalize(p.join(pwd, '.last.lst')),
			type: 'input'
		}
	]);
	function print () {
		var fs = require('fs');
		var child_process = require('child_process');
		var lio = require('./modules/lio.njs').getLIO([
		{
			name: 'wlast',
			path: p.normalize(p.join(pwd, '.last.lst')),
			type: 'output'
		},
		{
			name: 'pathList',
			path: p.normalize(p.join(pwd, '.pathList.path')),
			type: 'input'
		}
	]);
		function getFiles (path) {
			var files = [],
			    list = fs.readdirSync(path);
			while (list.length) {
				var tmp = p.join(path, list.shift());
				if (fs.statSync(tmp).isDirectory())
					files = files.concat(getFiles(tmp));
				else
					files.push(tmp);
			}
			return files;
		}
		var i = 0,
		    path,
		    fileList = [];
		while (path = lio.pathList.getLine(i++)) {
			path = p.normalize(path);
			fileList = fileList.concat(getFiles(path))
		}
		path = fileList[Math.floor(Math.random() * fileList.length)];
		var spawn = child_process.spawn,
		    lp = spawn('lp', [path, '-o landscape']);
		lp.stderr.on('data', function (data) {
			console.log(data);
		});
		lio.wlast.printLine(new Date().getTime());
	}
	
	var last = parseInt(lio.rlast.getLine(0)) || 0,
	    now = new Date().getTime();
	    lio.rlast.close();
	if ((now - last) / (1000 * 60 * 60 * 24) >= 7)
		print();
})();