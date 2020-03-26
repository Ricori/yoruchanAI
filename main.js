import CQWebsocket from 'cq-websocket';

//核心
import Logger from './modules/core/Logger';
import botUtilClass from './modules/core/botUtil'

//配置文件
import config from './config';

//本地代理服务器
require('./modules/core/Proxy')

//数据库
//import Yurusql from './modules/core/Yurusql';
//Yurusql.sqlInitialize();

//各种消息处理模块
import friendHandle from './handle/friendHandle';
import adminHandle from './handle/adminHandle';
import privateAndAtHandle from './handle/privateAndAtHandle';
import groupHandle from './handle/groupHandle';

//实例化全局bot操作对象
const botUtil = new botUtilClass(new CQWebsocket(config), new Logger());

//好友请求处理
botUtil.onFriend(friendHandle);

//私聊处理
botUtil.onPrivate(adminHandle, privateAndAtHandle)

//群组@处理
botUtil.onGroupAtMe(privateAndAtHandle)

//群组处理
botUtil.onGroup(groupHandle)

//连接socket监听
botUtil.socketConnecting();
