#!/usr/bin/env node

(function () {
	"use strict";

	const path = require('path');
	const fs = require('fs');
	const child_process = require('child_process');

	const printers = require('optManager').getopt.create([]).parseSystem().argv;

	const PWD = __dirname;
	const LOGS = path.join(PWD, 'logs');
	const ERROR_LOG = path.join(LOGS, 'error.log');

	function parseErr (err) {
		return [[err.syscall, err.path].join(' '), err.code].join(' - ');
	}

	function errorLog (str) {
		str = [new Date(), str].join(': ');
		fs.open(ERROR_LOG, 'a', (err, fd) => {
			if (err) {
				err.log = str;
				throw err;
			}
			fs.appendFile(fd, str + '\n', (err) => {
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

	function addLog (file, str) {
		str = [new Date(), str].join(': ');
		fs.open(path.join(LOGS, file), 'a', (err, fd) => {
			if (err) {
				errorLog(parseErr(err));
			} else {
				fs.appendFile(fd, str + '\n', (err) => {
					if (err) {
						errorLog(parseErr(err));
					} else {
						fs.close(fd, (err) => {
							if (err)
								errorLog(parseErr(err));
						});
					}
				});
			}
		});
	}

	function createLogFile (name, callback) {
		const logFile = [name, 'log'].join('.');
		const fullPath = path.join(LOGS, logFile);
		fs.open(fullPath, 'w', (err, fd) => {
			if (err) {
				errorLog(parseErr(err));
			} else {
				fs.close(fd, (err) => {
					if (err)
						errorLog(parseErr(err));
					else
						callback(name, fullPath);
				});
			}
		});
	}



	function print (printer) {
		function _printFile (file) {
			const spawn = child_process.spawn;

			var identify = spawn('identify', [file]),
			    info = '';

			identify.stderr.on('data', (data) => {errorLog(data.toString('utf8'))});
			identify.stdout.on('data', (data) => {info += data.toString('utf8')});
			identify.on('close', (code) => {
				if (code) {
					errorLog('image magic closed whith code ' + code);
				} else {
					info = /\b\d+x\d+\b/.exec(info)[0];
					if (!info) {
						errorLog('Can not get file resolution: ' + file);
					} else {
						info = info.split('x');
						var lpoptions = [file, '-d', printer];

						if (info[0] > info[1])
							lpoptions.push('-o landscape');
						var lp = spawn('lp', lpoptions);

						lp.stderr.on('data', (data) => {errorLog(printer + ": " + data.toString('utf8'))});
						lp.on('close', (code) => {
							if (code) {
								errorLog(printer + ': Print error: ' + code);
							} else {
								addLog([printer, 'log'].join('.'), 'Printing file: ' + file);
							}
						})
					}
					
				}
			});
		}

		var files = [];
		function _createFileList (pathes) {
			var p;
			while (!(p = pathes.shift()) && pathes.length);
			if (p) {
				p = path.resolve(p);
				
				fs.stat(p, (err, stats) => {
					if (err) {
						errorLog(parseErr(err));
					} else {
						if (stats.isDirectory()) {
							fs.readdir(p, (err, files) => {
								if(err) {
									errorLog(parseErr(err));
								} else {
									for (var i = 0, l = files.length; i < l; ++i)
										files[i] = path.join(p, files[i]);
									_createFileList(pathes.concat(files));
								}
							});
						} else {
							if(stats.isFile() && {gif: 1, png: 1, jpeg: 1, jpg: 1}[path.extname(p).substr(1).toLowerCase()]);
								files.push(p);
							_createFileList(pathes);
						}
					}
				});
			} else {
				_printFile(files[Math.floor(files.length * Math.random())]);
			}
		}

		fs.readFile(path.join(PWD, 'pathList.path'), {encoding: 'utf8'}, (err, data) => {
			if (err) {
				errorLog(parseErr(err));
			} else {
				if (!data)
					errorLog(path.join(PWD, 'pathList.path') + ' is empty.');
				else
					_createFileList(data.split('\n'));
			}
		});
	}

	function checkLastDate (name, file) {
		fs.open(file, 'r', (err, fd) => {
			if(err) {
				if (err.code === 'ENOENT') {
					createLogFile(name, checkLastDate);
				} else {
					errorLog(parseErr(err));
					print(name);
				}
			} else {
				var line = '';
				const SIZE = 10;
				function _findLastDate (pos) {
					function __toHour (ms) {
						return ms - ms % (1000 * 60 * 60);
					}

					fs.read(fd, new Buffer(SIZE), 0, SIZE, pos, (err, bytesRead, buffer) => {
						if (err) {
							errorLog(parseErr(err));
							print(name);
						} else {
								var str = buffer.toString('utf-8', 0, bytesRead);
							if (str.search('\n') < 0)
								line += str;
							else 
								line = str.substr(str.lastIndexOf('\n') + 1) || line;
							if (bytesRead === SIZE) {
								_findLastDate (pos + bytesRead);
							} else {
								line = line.split(':')[0];
								
								if ((new Date().getTime() - __toHour(new Date(line || 0).getTime())) / (1000 * 60 * 60 * 24) >= 7)
									print(name);
							}
						}
					});
				}
				_findLastDate(0);
			}
		});
	}

	fs.stat(LOGS, (err, stats) => {
		if (err) {
			if (err.code === 'ENOENT')
				fs.mkdir(LOGS, (err) => {
					if (err)
						errorLog(parseErr(err));
					else
						for (var i = 0, l = printers.length; i < l; ++i)
							createLogFile(printers[i], checkLastDate);
				});
			else
				errorLog(parseErr(err));
		} else {
			for (var i = 0, l = printers.length; i < l; ++i) {
				var printer = printers[i],
				    file = path.join(LOGS, [printer, 'log'].join('.'));
				checkLastDate(printer, file);
			}
		}
	});
})();