import config from '../config';
const setting = config.yuruConfig;

//通用处理模块
import commonHanle from './commonHanle';

//模块
import searchImg from '../modules/searchImg';


export default async function (context, botUtil) {

    if (commonHanle(context, botUtil)) {
        return;
    }

    const logger = botUtil.logger;
    const sendMsg = (msg, at = false) => {
        botUtil.replyMsg(context, msg, at);
    }
    const { group_id, user_id } = context;

    if (switchSearchMode(context, logger, botUtil.replyMsg)) {
        return;
    }

    //1.复读机
    if (setting.repeater.enable) {
        //rptLog得到当前复读次数
        if (logger.rptLog(group_id, user_id, context.message) >= setting.repeater.times) {
            logger.rptDone(group_id);
            setTimeout(() => {
                sendMsg(context.message);
            }, 2000);
        }
    }

    return;
}



function switchSearchMode(context, logger, replyMsg) {
    let { group_id, user_id } = context;
    let smStatus = logger.smStatus(group_id, user_id);
    if (smStatus) {
        const snDB = {
            all: 999,
            pixiv: 5,
            danbooru: 9,
            book: 18,
            anime: 21
        }
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
            searchImg(context, smStatus, replyMsg, logger);
        }
        return true;
    }
    return false;
}
