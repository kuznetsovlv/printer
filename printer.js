#!/usr/bin/env node

(function () {
	"use strict";

	const path = require('path');
	const fs = require('fs');

	const printers = require('optManager').getopt.create([]).parseSystem().argv;

	const PWD = __dirname;
	const LOGS = path.join(PWD, 'logs');
	const ERROR_LOG = path.join(LOGS, 'error.log');

	console.log(printers);

	function errorLog (str) {
		str = [new Date(), str].join(': ');
		fs.open(ERROR_LOG, 'a', (err, fd) => {
			if (err) {
				err.log = str;
				throw err;
			}
			fs.appendFile(fd, [str, '\n'].join(''), (err) => {
				if (err) {
					err.log = str;
					throw err;
				}
				fs.close(fd, (err) => {
					if (err) {
						err.log = str;
						throw err;
					}
				});
			});
		});
	}

	function createLogFile (name, callback) {
		const logFile = [name, 'log'].join('.');
		const fullPath = path.join(LOGS, logFile);
		fs.open(fullPath, 'w', (err, fd) => {
			if (err)
				return errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
			fs.close(fd, (err) => {
				if (err)
					return errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
				callback(name, fullPath);
			});
		});
	}

	function print (printer) {}

	function checkLastDate (name, file) {
		fs.open(file, 'r', (err, fd) => {
			if(err) {
				if (err.code === 'ENOENT')
					return createLogFile(name, readLastDate);
				errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
				return print(name);
			}

			var line = '',
			    size = 10;
			function _findLastDate (pos) {
				fs.read(fd, new Buffer(size), 0, size, pos, (err, bytesRead, buffer) => {
					if (err) {
						errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
						return print(name);
					}

					var str = buffer.toString('utf-8', 0, bytesRead);
					if (str.search('\n') < 0)
						line += str;
					else 
						line = str.substr(str.lastIndexOf('\n') + 1) || line;
					if (bytesRead === size) {
						_findLastDate (pos + bytesRead);
					} else {
						line = line.split(':')[0];
						
						if (new Date().getTime() - new Date(line || 0).getTime() / (1000 * 60 * 60 * 23) >= 7)
							print();
					}
				});
			}
			_findLastDate(0);
		});
	}

	fs.stat(LOGS, (err, stats) => {
		if (err) {
			if (err.code === 'ENOENT')
				fs.mkdir(LOGS, (err) => {
					if (err)
						return errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
					for (var i = 0, l = printers.length; i < l; ++i)
						createLogFile(printers[i], readLastDate);
				});
			else
				errorLog([[err.syscall, err.path].join(' '), err.code].join(' - '));
		}

		for (var i = 0, l = printers.length; i < l; ++i) {
			var printer = printers[i],
			    file = path.join(LOGS, [printer, 'log'].join('.'));
			readLastDate(printer, file);
		}

	});
	/*var pwd = '/root/.cronscripts/printer';
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
			if (!fs.existsSync(path))
				continue;
			var stat = fs.statSync(path);
			if (stat.isDirectory())
				var list = fileList.concat(getFiles(path));

			else if (stat.isFile())
				fileList.push(path);
		}
		path = fileList[Math.floor(Math.random() * fileList.length)];
		var spawn = child_process.spawn,
		    lp = spawn('lp', [path, '-o landscape']);
		lp.stderr.on('data', function (data) {
			var error = require('./modules/lio.njs').getLIO({
			    	name: 'error',
			    	path: p.normalize(p.join(pwd, 'error.log')),
			    	type: 'output'
			    }).error;
			error.printLine(new Date().getTime());
			for (var key in data)
				error.prinLine([key, data[key]].join(': '));
		});
		lio.wlast.printLine(new Date().getTime());
	}
	
	var last = parseInt(lio.rlast.getLine(0)) || 0,
	    now = new Date().getTime();
	    lio.rlast.close();
	if ((now - last) / (1000 * 60 * 60 * 24) >= 7)
		print();*/
})();