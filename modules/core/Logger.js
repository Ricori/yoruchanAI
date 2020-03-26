import Fs from 'fs';
import Path from 'path';

const banListFile = Path.resolve(__dirname, '../../data/ban.json');
const logFile = Path.resolve(__dirname, '../../data/log.json');

if (!Fs.existsSync(banListFile)){
	Fs.writeFileSync(banListFile, JSON.stringify({ u:[], g:[] }))
};

//封禁列表
let banList = require(banListFile);

//更新封禁列表文件
function updateBanListFile() {
	Fs.writeFileSync(banListFile, JSON.stringify(banList));
}


/**
 * 各种记录
 *
 * @class Logger
 */
class Logger {
	constructor() {
		this.searchMode = []; //搜图模式记录
		this.repeater = []; //复读记录
		this.searchCount = []; //搜索次数记录
		this.date = new Date().getDate();

		this.setulog = {g:{},u:{}};  //setu记录

		this.animeSearchLog = {};

		//读取保存数据
		/*if (Fs.existsSync(logFile)) {
			let {
				date,
				searchCount,
				hsaSign
			} = require(logFile);
			this.date = date;
			this.searchCount = searchCount;
			this.hsaSign = hsaSign;
		}*/

		setInterval(() => {
			//每日初始化
			let nowDate = new Date().getDate();
			if (this.date != nowDate) {
				this.date = nowDate;
				this.searchCount = [];
			}

		}, 60 * 1000);
	}

	static ban(type, id) {
		if (type == 'u') banList.u.push(id);
		else if (type == 'g') banList.g.push(id);
		updateBanListFile();
	}

	static checkBan(u, g = 0) {
		if (banList.u.includes(u)) return true;
		if (g != 0 && banList.g.includes(g)) return true;
		return false;
	}

	/**
	 * 搜图模式开关
	 *
	 * @param {number} g 群号
	 * @param {number} u QQ号
	 * @param {boolean} s 开启为true，关闭为false
	 * @param {Function} cb 定时关闭搜图模式的回调函数
	 * @returns 已经开启或已经关闭为false，否则为true
	 * @memberof Logger
	 */
	smSwitch(g, u, s, cb = null) {
		if (!this.searchMode[g]) this.searchMode[g] = [];
		if (!this.searchMode[g][u]) this.searchMode[g][u] = {
			enable: false,
			db: 999,
			timeout: null
		};
		let t = this.searchMode[g][u];
		//清除定时
		if (t.timeout) {
			clearTimeout(t.timeout);
			t.timeout = null;
		}
		//搜图模式切换
		if (s) {
			//定时关闭搜图模式
			if (g != 0) t.timeout = setTimeout(() => {
				t.enable = false;
				if (typeof cb == "function") cb();
			}, 120 * 1000);
			if (t.enable) return false;
			t.enable = true;
			t.db = 999;
			return true;
		} else {
			if (t.enable) {
				t.enable = false;
				return true;
			}
			return false;
		}
	}

	/**
	 * 设置搜图图库
	 *
	 * @param {number} g 群号
	 * @param {number} u QQ号
	 * @param {number} db 图库ID
	 * @memberof Logger
	 */
	smSetDB(g, u, db) {
		this.searchMode[g][u].db = db;
	}

	/**
	 * 获取搜图模式状态
	 *
	 * @param {number} g 群号
	 * @param {number} u QQ号
	 * @returns 未开启返回false，否则返回图库ID
	 * @memberof Logger
	 */
	smStatus(g, u) {
		if (!this.searchMode[g] || !this.searchMode[g][u] || !this.searchMode[g][u].enable) return false;
		return this.searchMode[g][u].db;
	}

	/**
	 * 记录复读情况
	 *
	 * @param {number} g 群号
	 * @param {number} u QQ号
	 * @param {string} msg 消息
	 * @returns 如果已经复读则返回0，否则返回当前复读次数
	 * @memberof Logger
	 */
	rptLog(g, u, msg) {
		let t = this.repeater[g];
		//没有记录或另起复读则新建记录
		if (!t || t.msg != msg) {
			this.repeater[g] = {
				user: u,
				msg: msg,
				times: 1,
				done: false
			}
			t = this.repeater[g];
		} else if (t.user != u) {
			//不同人复读则次数加1
			t.user = u;
			t.times++;
		}
		return t.done ? 0 : t.times;
	}

	/**
	 * 标记该群已复读
	 *
	 * @param {number} g 群号
	 * @memberof Logger
	 */
	rptDone(g) {
		this.repeater[g].done = true;
	}

	/**
	 * 记录并判断用户是否可以搜图
	 *
	 * @param {number} u QQ号
	 * @param {*} limit 限制
	 * @returns 允许搜图则返回true，否则返回false
	 * @memberof Logger
	 */
	canSearch(u, limit, key = 'search') {
		if (!this.searchCount[u]) this.searchCount[u] = {};
		if (key == 'setu') {
			if (!this.searchCount[u][key]) this.searchCount[u][key] = {
				date: new Date().getTime() - limit.cd * 1000,
				count: 0
			};
			let setuLog = this.searchCount[u][key];
			if (setuLog.date + limit.cd * 1000 <= new Date().getTime() && limit.value == 0) return true;
			if (setuLog.date + limit.cd * 1000 > new Date().getTime() || setuLog.count++ >= limit.value) return false;
			setuLog.date = new Date().getTime();
			return true;
		}
		if (limit == 0) return true;
		if (!this.searchCount[u][key]) this.searchCount[u][key] = 0;
		if (this.searchCount[u][key]++ < limit) return true;
		return false;
	}

	/**
	 * 获取setu记录
	 *
	 * @memberof Logger
	 */
	getSetuLog() {
		return this.setulog;
	}




	/**
	 * 番剧搜索模式开关
	 *
	 * @param {number} group 群号
	 * @param {number} user QQ号
	 * @param {boolean} sw 开启为true，关闭为false
	 * @returns 已经开启或已经关闭为false，否则为true
	 * @memberof Logger
	 */
	switchSearchAnime(group, user, sw, cb = null) {
		if (!this.animeSearchLog[group]) this.animeSearchLog[group] = {
			enable: false,
			useuser : null,
			nowstep: 0,
			timeout: null,
			bangumiList : null,
			subtitleGroupList : null,
			sourcelist : null,
			dateandep : null
		};

		let info = this.animeSearchLog[group];
		if (info.timeout) {
			clearTimeout(info.timeout);
			info.timeout = null;
		}

		if (sw) {
			if (group != 0) {
				info.timeout = setTimeout(() => {
					info.enable = false;
					this.animeSearchLog[group] = null;
					if (typeof cb == "function") cb();
				}, 300 * 1000);
			}
			if (info.enable) return false;
			info.enable = true;
			info.useuser = user;
			info.nowstep = 1;
			return true;
		} else {
			if (info.enable) {
				info.enable = false;
				this.animeSearchLog[group] = null;
				return true;
			}
			return false;
		}
	}

	/**
	 * 获取番剧搜索模式状态
	 *
	 * @param {number} group 群号
	 * @returns 未开启返回false，否则返回info
	 * @memberof Logger
	 */
	getSearchAnimeState(group) {
		if (!this.animeSearchLog[group] || !this.animeSearchLog[group].enable) return false;
		return this.animeSearchLog[group];
	}

	/**
	 * 更改番剧搜索模式step
	 *
	 * @param {number} group 群号
	 * @param {number} step 当前步骤
	 * @returns 失败返回false，否则true
	 * @memberof Logger
	 */
	setSearchAnimeStep(group,step) {
		if (!this.animeSearchLog[group] || !this.animeSearchLog[group].enable) return false;
		this.animeSearchLog[group].nowstep = step;
		return true;
	}

	/**
	 * 保存搜索的番剧列表
	 *
	 * @param {number} group 群号
	 * @param {array[]} bangumiList 番剧列表
	 * @returns 失败返回false，否则true
	 * @memberof Logger
	 */
	setSearchBangumiList(group,bangumiList) {
		if (!this.animeSearchLog[group] || !this.animeSearchLog[group].enable) return false;
		this.animeSearchLog[group].bangumiList = bangumiList;
		return true;
	}

	/**
	 * 保存搜索的字幕组列表和资源列表
	 *
	 * @param {number} group 群号
	 * @param {array[]} subtitleGroupList 字幕组列表
	 * @param {array[]} sourcelist 资源列表
	 * @returns 失败返回false，否则true
	 * @memberof Logger
	 */
	setSearchSourceList(group,subtitleGroupList,sourcelist,dateandep) {
		if (!this.animeSearchLog[group] || !this.animeSearchLog[group].enable) return false;
		this.animeSearchLog[group].subtitleGroupList = subtitleGroupList;
		this.animeSearchLog[group].sourcelist = sourcelist;
		this.animeSearchLog[group].dateandep = dateandep;
		return true;
	}
}

export default Logger;
