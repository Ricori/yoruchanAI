import REPLYTEXT from '../replyTextConfig';

//通用处理模块
import commonHanle from './commonHanle';

//工具模块
import { getDateFromText } from '../modules/utils/dateUtil';

//模块
import searchImg from '../modules/searchImg';
import animeSale from '../modules/animeSale';
import todayAnime from '../modules/todayAnime';
import searchVideo3 from '../modules/searchVideo3';
import recommendCar from '../modules/recommend';


export default async function (context, botUtil) {

    if (commonHanle(context, botUtil)) {
        return;
    }

    const logger = botUtil.logger;
    const hasText = (text) => {
        return context.message.search(text) != -1;
    }
    const sendMsg = (msg, at = false) => {
        botUtil.replyMsg(context, msg, at);
    }

    const { group_id, user_id } = context;
    if (hasText('--')) return;

    /***
		{
			condition:function(){},
			effect:function(){},
        }
	***/

    //1.帮助文本
    const helpHd = {
        condition: () => hasText("help") || hasText("帮助"),
        effect: async function () {
            sendMsg(REPLYTEXT.helptext, false);
        }
    };
    //2.运行文本
    const statusHd = {
        condition: () => hasText("status") || hasText("运行状态"),
        effect: async function () {
            let str = 'YURU SYSTEM 16.8\n';
            str += '系统运行时长：' + process.uptime() + '秒\n';
            str += '目前占用内存：' + process.memoryUsage().rss + '字节\n';
            str += '开始自检...\n'
            str += '核心：' + (logger ? '正常' : '异常') + '\n';
            str += '正常的模块：图片搜索模块、番剧搜索模块、番剧日程模块、色图模块模块、隐藏功能模块\n';
            str += '已爆炸的模块：番剧销量模块\n';
            /*
            str += '图片搜索模块：' + (searchImg ? '正常' : '异常') + '\n';
            str += '番剧搜索模块：' + (searchAnimeHandel ? '正常' : '异常') + '\n';
            str += '番剧日程模块：' + (todayAnime ? '正常' : '异常') + '\n';
            str += '番剧销量模块：' + (animeSale ? '正常' : '异常') + '\n';
            str += '色图模块：' + (setuHandle ? '正常' : '异常') + '\n';
            str += '隐藏功能模块：' + (searchVideo2 ? '正常' : '异常') + '\n';
            */
            str += '数据存储与交互：1.MongoDB 正常2.Redis缓存数据库 正常\n';
            str += '守护：pm2 v3.2.4 正常\n核心管理命令：允许使用--shutdown命令进行系统重启';
            sendMsg(str, false);
        }
    };
    //3.搜图
    const searchImgHd = {
        condition: () => hasImage(context.message),
        effect: async function () {
            searchImg(context, -1, botUtil.replyMsg, botUtil.logger);
        }
    };
    //4.开启搜图模式
    const openImgSearchModeHd = {
        condition: () => hasText("开启搜图模式"),
        effect: () => {
            if (logger.smSwitch(group_id, user_id, true, () => sendMsg(REPLYTEXT.serchModeAutoOff, true)))
                sendMsg(REPLYTEXT.serchModeOn, true);
            else
                sendMsg(REPLYTEXT.alreadyInSerchMode, true);

        }
    };
    //5.关闭搜图模式
    const closeImgSearchModeHd = {
        condition: () => hasText("关闭搜图模式"),
        effect: () => {
            if (logger.smSwitch(group_id, user_id, false))
                sendMsg(REPLYTEXT.serchModeOff, true)
            else
                sendMsg(REPLYTEXT.notAtSerchMode, true);
        }
    };
    //6.新番销量
    const animeSaleHd = {
        condition: () => hasText("销量") && hasText("番"),
        effect: async function () {
            let time = '2020-01';
            if (hasText("4月")) time = '2019-04';
            if (hasText("7月")) time = '2019-07';
            if (hasText("10月")) time = '2018-07';
            animeSale(time).then(ret => sendMsg(ret));
        }
    };
    //7.番剧日程
    const todayAnimeHd = {
        condition: () => /(.*?)[有]?什么番/.exec(context.message),
        effect: async function () {
            let riqi = /(.*?)[有]?什么番/.exec(context.message)[1];
            let date = getDateFromText(riqi);
            todayAnime(date.format('yyyyMMdd')).then(ret => sendMsg(ret));
        }
    };
    //8.发车
    let searchVideoHd = {
        //([a-zA-Z]{2,4}-[0-9]{3,4}$)
        condition: () => /发车(.*)/.exec(context.message),
        effect: async function () {
            let fh = /发车(.*)/.exec(context.message)[1];
            fh = encodeURI(fh);
            searchVideo3(fh, context).then(ret => sendMsg(ret));
        }
    };
    //9.推荐好车
    let recommendCarHd = {
        condition: () => hasText("推荐车次"),
        effect: async function () {
            sendMsg(recommendCar());
        }
    }

    let handleArr = [
        helpHd,
        statusHd,
        searchImgHd,
        openImgSearchModeHd,
        closeImgSearchModeHd,
        animeSaleHd,
        todayAnimeHd,
        searchVideoHd,
        recommendCarHd,
    ];

    //执行处理
    for (handle of handleArr) {
        if (handle.condition()) {
            handle.effect();
            return;
        }
    };

    sendMsg(REPLYTEXT.defaultReply(), false);
    return;
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