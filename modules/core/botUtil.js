import CQ from './CQcode';
import config from '../../config';
const setting = config.yuruConfig;

export default class botUtil {

    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
    }

    //监听器
    on = (ev, fc) => {
        this.bot.on(ev, fc);
    }
    //一次性监听器
    Once = (ev, fc) => {
        this.bot.once(ev, fc);
    }

    onFriend = (friendHandle) => {
        this.bot.on('request.friend', (e, cxt) => {
            friendHandle(cxt, this)
        })
    }
    onPrivate = (adminHandle, commonHandle) => {
        this.bot.on('message.private', (e, cxt) => {
            if (setting.admin.indexOf(cxt.user_id) > -1) {
                adminHandle(cxt, this);
            }
            commonHandle(cxt, this);
        });
    }
    onGroupAtMe = (handle) => {
        this.bot.on('message.group.@me', (e, cxt) => {
            handle(cxt, this)
        });
    }
    onGroup = (handle) => {
        this.bot.on('message.group', (e, cxt) => {
            handle(cxt, this)
        });
    }

    //连接socket监听
    socketConnecting = () => {
        this.bot
            .on('socket.connecting',
                (wsType, attempts) => console.log(`${new Date().toLocaleString()} 连接中`))
            .on('socket.failed',
                (wsType, attempts) => console.log(`${new Date().toLocaleString()} 连接失败`))
            .on('socket.error',
                (wsType, err) => console.log(`${new Date().toLocaleString()} 连接错误`))
            .on('socket.connect',
                (wsType, sock, attempts) => {
                    console.log(`${new Date().toLocaleString()} 连接成功`);
                }
            );
        this.bot.connect();
    }

    //回应加好友请求
    setFriendAddRequest = (flag) => {
        this.bot('set_friend_add_request', {
            flag,
            approve: setting.autoAddFriend
        });
    }
    //回应加群请求
    setGroupAddRequest = (cxt) => {
        this.bot('set_group_add_request', {
            flag: cxt.flag,
            type: "invite",
            approve: true
        });
    }

    //私信
    sendPrivateMsg = (user, msg) => {
        this.bot('send_private_msg', {
            user_id: user,
            message: msg
        });
    }

    /**
     * 回复消息
     *
     * @param {object} context 消息对象
     * @param {string} msg 回复内容
     * @param {boolean} at 是否at发送者
     */
    replyMsg = (context, msg, at = false) => {
        if (typeof (msg) != "string" || !msg.length > 0) return;
        if (context.group_id) {
            return this.bot('send_group_msg', {
                group_id: context.group_id,
                message: at ? CQ.at(context.user_id) + msg : msg
            });
        } else if (context.discuss_id) {
            return this.bot('send_discuss_msg', {
                discuss_id: context.discuss_id,
                message: at ? CQ.at(context.user_id) + msg : msg
            });
        } else if (context.user_id) {
            return this.bot('send_private_msg', {
                user_id: context.user_id,
                message: msg
            });
        }
    }




}


