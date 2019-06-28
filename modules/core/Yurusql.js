import config from '../../config';
import co from 'co';
import mysql_co from 'mysql-co';

let conf = config.mysql;
let expire = conf.expire || 2 * 24 * 3600; //缓存时间
let hasInitialize = false; //是否初始化
let isEnable = (config.mysql && config.mysql.enable) || false; //是否启用

/**
 * 得到当前时间戳
 *
 * @returns 当前时间戳（秒）
 */
function getDateSec() {
	return Math.floor(Date.now() / 1000);
}

/**
 * Picfinder数据库
 *
 * @class mysql
 */
class Yurusql {
	/**
	 * 连接数据库
	 * @memberof Yurusql
	 */
	constructor() {
		this.mysql = mysql_co.createConnection({
			host: conf.host,
			port: conf.port || 3306,
			database: conf.db,
			user: conf.user,
			password: conf.password
		});
	}

	/**
	 * 关闭数据库连接
	 * 
	 * @memberof Yurusql
	 */
	close() {
		this.mysql.end();
	}

	/**
	 * 增加bangumi记录
	 *
	 * @param {Object} info 信息对象
	 * @returns Promise
	 * @memberof Yurusql
	 */
	addBangumi(info) {
		let mysql = this.mysql;
		return co(function* () {
			yield mysql.query(
			'REPLACE INTO `bangumilist` (`id`, `name`) VALUES (?, ?)', 
			[info.id, info.name]);
		});
	}

	/**
	 * 增加字幕组记录
	 *
	 * @param {Object} info 信息对象
	 * @returns Promise
	 * @memberof Yurusql
	 */
	addSubtitleGroup(info) {
		let mysql = this.mysql;
		return co(function* () {
			yield mysql.query(
			'REPLACE INTO `subtitlegroup` (`id`, `sortid`,`name`) VALUES (?, ?, ?)', 
			[info.id, info.sortid, info.name]);
		});
	}



	/**
	 * 增加动画资源记录
	 *
	 * @param {Object} info 动画信息对象
	 * @returns Promise
	 * @memberof Yurusql
	 */
	addAnimeSourceInfo(info) {
		let mysql = this.mysql;
		return co(function* () {
			yield mysql.query(
			'INSERT INTO `animesouce` (`animeId`, `subtitleGroupId`, `definition`, `lanauage`, `episode`, `date`, `magnet`, `size`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
			[info.animeId, info.subtitleGroupId, info.definition, info.lanauage,info.episode,info.date,info.magnet,info.size]);
		});
	}


	/**
	 * 增加或更新缓存记录
	 *
	 * @param {string} img 图片文件名
	 * @param {number} db 搜索库
	 * @param {object} msg 消息
	 * @returns Promise
	 * @memberof Yurusql
	 */
	addCache(img, db, msg) {
		let mysql = this.mysql;
		return co(function* () {
			yield mysql.query('REPLACE INTO `cache` (`img`, `db`, `t`, `msg`) VALUES (?, ?, ?, ?)', [img, db, getDateSec(), JSON.stringify(msg)]);
		});
	}


	/**
	 * 得到缓存记录
	 *
	 * @param {*} img
	 * @param {*} db
	 * @returns
	 * @memberof Yurusql
	 */
	getCache(img, db) {
		let mysql = this.mysql;
		return co(function* () {
			let que = yield mysql.query('SELECT * from `cache` WHERE img=? AND db=?', [img, db]);
			let rq = que[0];
			if (rq.length > 0 && (getDateSec() - rq[0].t) < expire) {
				return JSON.parse(rq[0].msg);
			}
			return false;
		});
	}


	/**
	 * 数据库建表
	 *
	 * @static
	 * @memberof Yurusql
	 */
	static async sqlInitialize() {
		/*
		if (isEnable && !hasInitialize) {
			let test = new Yurusql();
			await co(function* () {
				yield test.mysql.query('CREATE TABLE IF NOT EXISTS `cache` ( `img` VARCHAR(40) NOT NULL , `db` INT NOT NULL , `t` INT NOT NULL , `msg` TEXT NOT NULL , PRIMARY KEY (`img`, `db`)) ENGINE = InnoDB;');
				test.close();
			});
			hasInitialize = true;
		}
		*/
	}

	/**
	 * 是否启用数据库
	 *
	 * @static
	 * @returns Boolean
	 * @memberof Yurusql
	 */
	static isEnable() {
		return isEnable && hasInitialize;
	}
}


export default Yurusql;
