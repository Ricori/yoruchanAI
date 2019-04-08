const replyText = {

    //不在功能范围时默认回复
    defaultReply : function(){return randomText([
        '渣滓主人请不要提过分的要求',
        '你说你🐎呢',
    ])},

    //搜图模式
    serchModeOn : '夜夜酱现在已经切换至搜图模式啦(^・ω・^ )',
    serchModeOff : '夜夜酱已经成功退出搜图模式啦(^・ω・^ )',
    serchModeAutoOff : '搜图模式下的夜夜好累T T，防止坏掉已经自动退出啦，下次记得为我手动关闭哦..',
    alreadyInSerchMode : '夜夜酱已经在搜图模式下啦，不要再叫夜夜了',
    notAtSerchMode : '夜夜酱现在并不在搜图模式下哦，需要开启吗？',

    //图源搜索
    serchOk : '夜夜酱找到啦，',
    serchError : '夜夜没能找到相关信息呢，可能是网络接口被玩坏了T T',
    serchLimit : '主人今天使用夜夜酱的次数过多了呢，明天再来吧',  //搜索限制
    serchSimilarityLow : '很抱歉夜夜酱难以找到更相似的图片\n' + 
        '主人寻找的图片可能并未被各大网站收录，或是图片不完整/无关部分过多，ユルチャンは顽张っていきたいです\n',
    nhentaiError : '夜夜酱无法在找到对应的本子T T\n可能是夜夜酱的网络接口坏掉了呢',  //nheitai出现错误
    saucenaoLimit : '跟夜夜PY的saucenao酱单位时间内已经不行了呢，等等再来吧',  //saucenao限制
    waPicTooLarge : '跟夜夜PY的whatAnime酱说图片体积太大啦，小一点才能受得了哦', //whatAnime图片大小限制
    waLimit : '跟夜夜PY的whatAnime酱现在已经受不了了呢，请等待一下吧', //whatAnime搜索限制
    r18warn : '请注意该番是R18哦',  //R18提醒

    //番剧日程
    serchScheduleOk : function(date){return `夜夜酱已经找到${date}的番剧日程啦：\n`},

    //色图
    setuLimit : '少年节制啊节制（虽然夜夜酱是很开心啦',   //索要色图限制
    setuAbnormal : '夜夜酱的色图功能坏掉了啦..',  //色图功能出现Bug
    
    //拒绝服务
    debugMode : '夜夜酱正在修复自己的身体呢，等修复完成后再来吧',  //debug模式对普通用户回复
    refuse : '抱歉哦，夜夜酱不能为你服务呢',    //拒绝为黑名单用户服务
}

//帮助文本
replyText.helptext = '1.@夜夜酱附带图片可以实现全网检索哦。' + 
'也可以加上 \'限定pixiv/danbooru/book/anime\'来限定搜索来源呢，' +
'比如只想搜索p站，那么附带图片后可以写上 \'限定pixiv\'；\n' +
'2.可以@夜夜酱 开启/关闭搜图模式，在搜图模式下，接下来群内所有图片都会被检索，主人可以快速检索多张图片哦。' +
'当然，在此模式下也是可以直接发送pixiv/danbooru/book/anime 来限定搜索来源的，夜夜酱会切换到对应模式哦。' +
'手动未关闭情况下，一段时间后也是会自动关闭搜图模式的，防止打扰到主人们正常聊天；\n' +
'3.可以@夜夜酱 查询番剧销量数据哦，比如\'我要看新番销量\'、\'7月番销量\、\'19年1月番销量\'之类哦； \n' + 
'4.可以@夜夜酱 查询番剧日程哦，比如\'今天有什么番\'、\'明天什么番\'、\'这周日什么番\'、\'20181230什么番\'； \n' + 
'5.夜夜酱是支持私聊的呢。\n' + 
'6.可以叫夜夜酱发色图哦，比如\'夜夜酱发色图\' \'夜夜酱我想要一份色图\'之类的。 \n' + 
'7.夜夜酱的ver1.2版本对应16.4岁，随着年龄增长，夜夜酱服侍主人的技术会越来越强的哦。';


function randomText(textArr){
    let i = Math.floor(Math.random()*textArr.length);
    return textArr[i];
}

export default replyText;