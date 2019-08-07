import CQWebsocket from 'cq-websocket';

//核心模块
import CQ from './modules/core/CQcode';
//import Yurusql from './modules/core/Yurusql';
import Logger from './modules/core/Logger';

//配置文件
import config from './config';
import replyText from './replyTextConfig';

//工具模块
import {getTime , getDateFromText} from './modules/utils/dateUtil';

//搜图模块
import searchImg from './modules/searchImg';
import { snDB } from './modules/searchimg/saucenao';

//其他模块
import animeSale from './modules/animeSale';
import todayAnime from './modules/todayAnime';
import searchVideo from './modules/searchVideo';

//插件模块
import setuHandle from './modules/plugin/Setu/handle';
import searchAnimeHandel from './modules/plugin/SearchAnime/handle'


//本地代理服务器
import Proxyf from './modules/core/Proxy'


//初始化数据库
//Yurusql.sqlInitialize();

//全局常量
const setting = config.yuruConfig;
const bot = new CQWebsocket(config);
const logger = new Logger();

//好友请求处理
bot.on('request.friend', (context) => {
	bot('set_friend_add_request', {
		flag: context.flag,
		approve: setting.autoAddFriend
	});
});

//管理员命令处理
bot.on('message.private', (e, context) => {
	if (setting.admin.indexOf(context.user_id) > -1) {
		//允许加群
		let search = /--add-group=([0-9]+)/.exec(context.message);
		if (search) {
			replyMsg(context, `即将同意进入群${search[1]}的邀请`);
			//注册一次性监听器
			bot.once('request.group.invite', (context2) => {
				if (context2.group_id == search[1]) {
					bot('set_group_add_request', {
						flag: context2.flag,
						type: "invite",
						approve: true
					});
					replyMsg(context, `夜夜酱已成功进入群${context2.group_id}`);
					return true;
				}
				return false;
			});
			return;
		}

		//停止程序(利用pm2重启)
		if (context.message == '--shutdown') process.exit();

		//封禁
		search = /--ban-([ug])=([0-9]+)/.exec(context.message);
		if (search) {
			Logger.ban(search[1], parseInt(search[2]));
			replyMsg(context, `已经把坏孩子${search[1]=='u'?'用户':'群组'}${search[1]}关进小黑屋了`);
			return;
		}
	}
});


//监听器
if (setting.debug) {
	//私聊
	bot.on('message.private', debugPrivateAndAtMsg);
	//群组@
	bot.on('message.group.@me', debugPrivateAndAtMsg);
} else {
	//私聊
	bot.on('message.private', privateAndAtMsg);
	//群组@
	bot.on('message.group.@me', privateAndAtMsg);
	//群组
	bot.on('message.group', groupMsg);
}

//连接相关监听
bot.on('socket.connecting', 
		(wsType, attempts) => console.log(`${getTime()} 连接中[${wsType}]#${attempts}`))
	.on('socket.failed', 
		(wsType, attempts) => console.log(`${getTime()} 连接失败[${wsType}]#${attempts}`))
	.on('socket.error', 
		(wsType, err) => console.log(`${getTime()} 连接错误[${wsType}]#${err}`))
	.on('socket.connect', 
		(wsType, sock, attempts) => {
		console.log(`${getTime()} 连接成功[${wsType}]#${attempts}`);
		
		/* if (setting.admin > 0) {
			setTimeout(() => {
				bot('send_private_msg', {
					user_id: setting.admin,
					message: `夜夜酱已经部署完成([${wsType}]#${attempts})`
				});
			}, 5000)
		} */
		}
	);

//连接
bot.connect();


//调试模式
function debugPrivateAndAtMsg(e, context) {
	if (context.user_id != setting.admin) {
		e.stopPropagation();
		return replyText.debugMode;
	} else {
		privateAndAtMsg(e, context);
	}
}


//通用处理
function commonHandle(e, context) {
	//黑名单检测
	if (Logger.checkBan(context.user_id, context.group_id)) return false;
	//插件
	if (setting.setu.enable) {
		if (setuHandle(context,bot,replyMsg,logger)) return false;
	}
	if (searchAnimeHandel(context,bot,replyMsg,logger)) return false;

	return true;
}


//私聊以及群组@的处理
async function privateAndAtMsg(e, context) {
	if (!commonHandle(e, context)) return;
	let { group_id, user_id } = context;
	function hasText(text) {
		return context.message.search(text) != -1;
	}
	if(hasText("--")) return;
	let handle = [
		{	//帮助文本
			condition: function(){ return hasText("help") || hasText("帮助") },
			effect: function(){
				replyMsg(context, replyText.helptext, false);
			}
		},
		{	//运行状态
			condition: function(){ return hasText("status") || hasText("运行状态") },
			effect: function(){
				let str = 'YURU SYSTEM 16.4\n';
				str += '系统运行时长：' + process.uptime() + '秒\n';
				str += '目前占用内存：' + process.memoryUsage().rss + '字节\n';
				str += '开始系统自检...\n'
				str += '核心模块：' + (logger ? '正常' : '异常') + '\n';
				str += '图片搜索模块：' + (searchImg ? '正常' : '异常') + '\n';
				str += '番剧搜索模块：' + (searchAnimeHandel ? '正常' : '异常') + '\n';
				str += '番剧日程模块：' + (todayAnime ? '正常' : '异常') + '\n';
				str += '番剧销量模块：' + (animeSale ? '正常' : '异常') + '\n';
				str += '色图模块：' + (setuHandle ? '正常' : '异常') + '\n';
				str += '隐藏功能模块：' + (searchVideo ? '正常' : '异常') + '\n';
				str += '数据库连接状态：正常\n数据缓存状态：正常\n' ;
				str += '守护进程：pm2 v3.2.4\n守护状态：正常\n管理用户允许使用--shutdown命令进行系统重启\n完毕。' ;
				replyMsg(context, str, false);
			}
		},
		{	//进行搜图
			condition: function(){ return hasImage(context.message) },
			effect: function(){
				e.stopPropagation();
				searchImg(context, -1, replyMsg, logger);
			}
		},
		{	//开启搜图模式
			condition: function(){ return hasText("开启搜图模式") },
			effect: function(){
				e.stopPropagation();
				if (logger.smSwitch(group_id, user_id, true, 
					() => {replyMsg(context, replyText.serchModeAutoOff, true)})
				){
					replyMsg(context, replyText.serchModeOn, true);
				}
				else replyMsg(context, replyText.alreadyInSerchMode, true);
			}
		},
		{	//关闭搜图模式
			condition: function(){ return hasText("关闭搜图模式") },
			effect: function(){
				e.stopPropagation();
				if (logger.smSwitch(group_id, user_id, false))
					replyMsg(context, replyText.serchModeOff, true)
				else
					replyMsg(context, replyText.notAtSerchMode, true);
			}
		},
		{	//新番销量
			condition: function(){ return hasText("销量") && hasText("番") },
			effect: async function(){
				let time = '2019-07';
				if(hasText("1月")) time = '2019-01';
				if(hasText("4月")) time = '2019-04';
				if(hasText("10月")) time = '2018-07';
				e.stopPropagation();
				animeSale(time).then(
					ret => { replyMsg(context, ret) }
				);
			}
		},
		{	//番剧日程
			condition: function(){ return /(.*?)[有]?什么番/.exec(context.message) },
			effect: async function(){
				let riqi = /(.*?)[有]?什么番/.exec(context.message)[1];
				let date = getDateFromText(riqi);
				todayAnime(date.format('yyyyMMdd')).then(
					ret => { replyMsg(context, ret) }
				);
			}
		},
		{
			condition: function(){ return /发车([a-zA-Z]{2,4}-[0-9]{3,4}$)/.exec(context.message)},
			effect: async function(){ 
				let fh = /([a-zA-Z]{2,4}-[0-9]{3,4}$)/.exec(context.message)[1];
				searchVideo(fh,context).then(
					ret => { replyMsg(context, ret) }
				);
			}
		},

		/***
		{
			condition: function(){ return false },
			effect: function(){ }
		},
		***/

	];

	for(let i = 0; i < handle.length; i++) {
		if(handle[i].condition()){
			handle[i].effect();
			return;
		}
	}

	replyMsg(context, replyText.defaultReply(), false);
	return;
}


//群组消息处理
function groupMsg(e, context) {
	if (!commonHandle(e, context)) return;
	let { group_id, user_id } = context;

	if(switchSearchMode(context)) return;
	
	//复读机功能
	if (setting.repeater.enable) {  
		//随机复读，rptLog得到当前复读次数
		if (logger.rptLog(group_id, user_id, context.message) >= setting.repeater.times) {
			logger.rptDone(group_id);
			//延迟2s后复读
			setTimeout(() => {
				replyMsg(context, context.message);
			}, 2000);
		}
	}
}

function switchSearchMode(context){
	let { group_id, user_id } = context;
	//搜图模式检测
	let smStatus = logger.smStatus(group_id, user_id);
	if (smStatus) {
		//获取搜图模式下的搜图参数
		function getDB() {
			let cmd = /^(all|pixiv|danbooru|book|anime)$/.exec(context.message);
			if (cmd) return snDB[cmd[1]] || -1;
			return -1;
		}
		//切换搜图模式
		let cmdDB = getDB();
		if (cmdDB !== -1) {
			logger.smSetDB(group_id, user_id, cmdDB);
			smStatus = cmdDB;
			replyMsg(context, `Now in the '[${context.message}]' limited search mode.`)
		}
		//有图片则搜图
		if (hasImage(context.message)) {
			//重置搜图TimeOut时间
			logger.smSwitch(group_id, user_id, true, () => {
				replyMsg(context, replyText.serchModeAutoOff, true);
			});
			e.stopPropagation();
			searchImg(context, smStatus, replyMsg, logger);
		}
		return true;
	}
	return false;
}


/**
 * 判断消息是否有图片
 *
 * @param {string} msg 消息
 * @returns 有则返回true
 */
function hasImage(msg) {
	return msg.indexOf("[CQ:image") !== -1;
}


/**
 * 回复消息
 *
 * @param {object} context 消息对象
 * @param {string} msg 回复内容
 * @param {boolean} at 是否at发送者
 */
function replyMsg(context, msg, at = false) {
	if (typeof (msg) != "string" || !msg.length > 0) return;
	if (context.group_id) {
		return bot('send_group_msg', {
			group_id: context.group_id,
			message: at ? CQ.at(context.user_id) + msg : msg
		});
	} else if (context.discuss_id) {
		return bot('send_discuss_msg', {
			discuss_id: context.discuss_id,
			message: at ? CQ.at(context.user_id) + msg : msg
		});
	} else if (context.user_id) {
		return bot('send_private_msg', {
			user_id: context.user_id,
			message: msg
		});
	}
}
