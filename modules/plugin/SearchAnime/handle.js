import CQ from '../../core/CQcode';
import Axios from 'axios';
import cheerio from 'cheerio';

//import config from '../../../config';
//const setting = config.yuruConfig;
//import replyText from '../../../replyTextConfig';
import Yurusql from '../../core/Yurusql';

function MsgHandle(context, botUtil) {
    //群聊还是私聊
    if (context.group_id) {
        let group = context.group_id;
        let user = context.user_id;
        let state = botUtil.logger.getSearchAnimeState(group);
        let msg;

        //step1
        if (/测试番剧搜索:(.*)/.exec(context.message)) {
            if (state && state.enable) {
                botUtil.replyMsg(context, '群里已经有人在使用夜夜酱搜索番剧啦！', true);
                return true;
            }

            let searchAnimeName = /测试番剧搜索:(.*)/.exec(context.message)[1];
            if (searchAnimeName == '') return false;

            botUtil.logger.switchSearchAnime(group, user, true, () => {
                botUtil.replyMsg(context, '过长时间没有完成番剧搜索操作，夜夜酱已经释放控制权啦');
                return true;
            });

            searchAnimeStep1(searchAnimeName).then((step1result) => {
                if (step1result.success) {
                    if (step1result.length == 0) {
                        msg = '夜夜酱没有找到相关的番剧，请主人尝试搜索关键词。'
                        botUtil.replyMsg(context, msg);
                        botUtil.logger.switchSearchAnime(group, user, false);
                    } else if (step1result.length == 1) {
                        let bangumiList = step1result.data;
                        botUtil.logger.setSearchAnimeStep(group, 2);
                        botUtil.logger.setSearchBangumiList(group, bangumiList);
                        msg = `夜夜酱找到了1部匹配的番剧：${bangumiList[0].name}，请主人进行确认（发送"确认搜索"）`
                        botUtil.replyMsg(context, msg);
                    } else {
                        let bangumiList = step1result.data;
                        botUtil.logger.setSearchAnimeStep(group, 2);
                        botUtil.logger.setSearchBangumiList(group, bangumiList);
                        msg = `夜夜酱找到了${step1result.length}部匹配的番剧：\n`;
                        for (let i = 0; i < bangumiList.length; i++) {
                            msg += `${i + 1}.${bangumiList[i].name} \n`
                        }
                        msg += '请主人进行选择确认（发送"确认搜索"+编号）'
                        botUtil.replyMsg(context, msg);
                    }
                } else {
                    msg = '夜夜酱好像出现了点问题呢，请主人查看：\n' + step1result.err;
                    botUtil.replyMsg(context, msg);
                    botUtil.logger.switchSearchAnime(group, user, false);
                }
            });
            return true;
        }

        //step2
        if (/确认搜索(\d?)/.exec(context.message)) {
            if (state.enable && state.nowstep == 2) {
                if (state.useuser == user) {
                    let choose = /确认搜索(\d?)/.exec(context.message)[1];
                    if (choose == '') {
                        choose = 0
                    } else {
                        choose = choose - 1;
                    }
                    let chooseBangumi = state.bangumiList[choose];
                    botUtil.replyMsg(context, `夜夜酱已全力在磁力网络中寻找《${chooseBangumi.name}》，请主人稍等片刻...`);

                    searchAnimeStep2(chooseBangumi).then((step2result) => {
                        if (step2result.success) {
                            let subtitleGroupList = step2result.subtitleGroupList;
                            let sourcelist = step2result.sourcelist;

                            if (sourcelist && sourcelist.length == 0) {
                                msg = '夜夜酱没有找到相关的资源，可能系统正在分析与整理中，主人可以过1--2天再试试哦。';
                                botUtil.replyMsg(context, msg);
                                botUtil.logger.switchSearchAnime(group, user, false);
                            };

                            let dateandep = getMaxDateAndEp(sourcelist);
                            updateSourceDb(sourcelist[0].animeId, dateandep.maxdate, dateandep.maxepisode, sourcelist);

                            msg = `已经完成检索与分析，该番存在${sourcelist.length}个有效资源\n` +
                                `以下${subtitleGroupList.length}个字幕组参与过字幕制作：\n`;

                            for (let i = 0; i < subtitleGroupList.length; i++) {
                                msg += `${i + 1}.${subtitleGroupList[i].name}\n`;
                            }

                            msg += `目前最新资源为第${dateandep.maxepisode}集，上传于${dateandep.maxdate}\n`;

                            if (dateandep.haveallepset) {
                                msg += `本番剧还存在字幕组合集资源，集数为${dateandep.epset[0].episode}\n`;
                                /*
                                dateandep.epset.forEach((source)=>{
                                    msg += source.episode + ' '
                                })
                                */
                            };

                            msg += '本番各集均存在1080P/720P两种清晰度及简体中文(sc)/繁体中文(tc)语言版本供以选择。\n'

                            msg += '请按照规则筛选选择你要的资源（发送"选择资源sg+字幕组序号,ep+集号,defi+1080/720,lang+sc/tc" 合集存在时可发送"选择资源hj"）。' +
                                '以上条件均为可选，默认为最优字幕组最新集数1080P简体中文，筛选示例:选择资源sg2,ep06,defi1080,langsc / 选择资源ep11,defi1080 / 选择资源hj '
                            botUtil.logger.setSearchAnimeStep(group, 3);
                            botUtil.logger.setSearchSourceList(group, subtitleGroupList, sourcelist, dateandep);
                            botUtil.replyMsg(context, msg);
                        } else {
                            msg = '夜夜酱好像出现了点问题呢，请主人查看：\n' + step2result.err;
                            botUtil.replyMsg(context, msg);
                            botUtil.logger.switchSearchAnime(group, user, false);
                        }

                    });
                } else {
                    msg = '夜夜酱的番剧搜索功能正在被其他人使用呢，请等待释放控制权。';
                    botUtil.replyMsg(context, msg, true);
                }
                return true;
            } else {
                return false;
            }
        }

        //step3
        if (/选择资源([0-9a-zA-Z\,]*)/.exec(context.message)) {
            if (state.enable && state.nowstep == 3) {
                if (state.useuser == user) {
                    let tj = context.message.match(/选择资源([0-9a-zA-Z\,]*)/)[1];
                    let res = chooseSouece(state, tj);
                    if (res.success) {
                        let rescount = res.reslist.length || 0;
                        if (rescount == 0) {
                            msg = '夜夜酱没有找到符合条件的资源，请更换条件重试。'
                            botUtil.replyMsg(context, msg);
                        } else {
                            if (rescount < 5) {
                                msg = `找到了${rescount}个资源\n`;
                                res.reslist.forEach((r, i) => {
                                    msg += `${i + 1}.${r.magnet}\n`
                                })
                            } else {
                                msg = `找到了${rescount}个资源，篇幅原因只显示前5个资源磁力：`
                                for (let i = 0; i < 5; i++) {
                                    msg += `${i + 1}.${res.reslist[i].magnet}\n`
                                }
                            }
                            msg += '如需要该番其他资源一段时间内可继续发送"选择资源"+条件，结束请发送"停止搜番"。';
                            botUtil.replyMsg(context, msg);
                        }
                    } else {
                        msg = '筛选条件格式错误，请检查并重试。'
                        botUtil.replyMsg(context, msg, true);
                    }

                } else {
                    msg = '夜夜酱的番剧搜索功能正在被其他人使用呢，请等待释放控制权。';
                    botUtil.replyMsg(context, msg, true);
                }
                return true;
            } else {
                return false;
            }
        }


        //close
        if (/停止搜番/.exec(context.message)) {
            if (state && state.enable) {
                msg = '夜夜酱已经停止番剧资源搜索啦。';
                botUtil.replyMsg(context, msg);
                botUtil.logger.switchSearchAnime(group, user, false);
            }
        }



    } else {
        //暂不支持私聊
        return false;
    };


    return false;
}


async function searchAnimeStep1(searchAnimeName) {
    console.log('搜索：' + searchAnimeName);
    let result;
    let url = escape('https://mikanani.me/Home/Search?page=1&searchstr=' + searchAnimeName);
    await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url}&type=search`).then(
        (ret) => {
            let $ = cheerio.load(ret.data);
            let bangumiList = [];
            $('.an-ul li a').each(function (i, elem) {
                let bangumi = {
                    id: 0,
                    name: '',
                    url: ''
                };
                bangumi.id = $(this).attr('href').split('/')[3];
                bangumi.name = $(this).find('.an-text').text();
                bangumi.url = 'https://mikanani.me/Home/Bangumi/' + bangumi.id;
                bangumiList.push(bangumi);
            });
            console.log(`寻找到${bangumiList.length}部番剧...`);

            if (bangumiList.length == 0) {
                return {
                    success: true,
                    length: 0
                };
            }

            let sql = new Yurusql();
            for (let i = 0; i < bangumiList.length; i++) {
                sql.addBangumi(bangumiList[i]).then(
                    //() => console.log(`[${i}] bangumi insert successfully`)
                ).catch(
                    err => {
                        console.error(`[${i}] bangumi insert ${err}`);
                    }
                );
            }

            return {
                success: true,
                length: bangumiList.length,
                data: bangumiList
            };
        }
    ).then(r => result = r).catch(e => {
        console.error(`${new Date().toLocaleString()} [error] searchAnime step1 ${e}`);
        result = {
            success: false,
            err: '[searchAnime step1 error]' + e
        };
    });
    return result;
}


async function searchAnimeStep2(chooseBangumi) {
    let result;
    let url2 = escape(chooseBangumi.url);
    await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url2}&type=search`).then(
        async function step2(ret2) {
            let $2 = cheerio.load(ret2.data);
            let subtitleGroupList = [];
            $2('.subgroup-text').each(function (i, elem) {
                let subtitleGroup = {
                    id: 0,
                    sortid: 0,
                    name: ''
                };
                subtitleGroup.sortid = $2(this).attr('id');
                if (subtitleGroup.sortid == 202) {
                    subtitleGroup.id = 0;
                    subtitleGroup.name = '生肉/不明字幕组'
                } else {
                    subtitleGroup.id = $2(this).find('a:nth-child(1)').attr('href').split('/')[3];
                    subtitleGroup.name = $2(this).find('a:nth-child(1)').text();
                };
                subtitleGroupList.push(subtitleGroup);
            });

            console.log(`共有${subtitleGroupList.length}个字幕组为本番制作字幕`);

            let sql = new Yurusql();
            for (let i = 0; i < subtitleGroupList.length; i++) {
                sql.addSubtitleGroup(subtitleGroupList[i]).then(
                    //() => console.log(`[${i}]subtitleGroup insert successfully`)
                ).catch(err => {
                    console.error(`[${i}]subtitleGroup insert ${err}`);
                })
            }

            let sourceInfoList = [];
            $2('.table-striped tbody').each(function (i, elem) {
                let sourceInfo = {
                    animeId: chooseBangumi.id,
                    subtitleGroupId: subtitleGroupList[i].id,
                    subtitleSortId: subtitleGroupList[i].sortid,
                    dates: [],
                    titles: [],
                    magnets: [],
                    sizes: [],
                };
                $2(this).find('tr').each(function (i, elem) {
                    sourceInfo.titles.push($2(this).find('td:nth-child(1) a:nth-child(1)').text());
                    sourceInfo.magnets.push($2(this).find('td:nth-child(1) a:nth-child(2)').attr('data-clipboard-text'));
                    sourceInfo.sizes.push($2(this).find('td:nth-child(2)').text());
                    sourceInfo.dates.push($2(this).find('td:nth-child(3)').text());
                });
                sourceInfoList.push(sourceInfo);
            });

            let requestPromises = [];
            sourceInfoList.forEach(source => {
                if (source.titles.length == 15) {
                    requestPromises.push(
                        Axios.post('https://mikanani.me/Home/ExpandEpisodeTable', {
                            bangumiId: source.animeId,
                            subtitleGroupId: source.subtitleSortId,
                            take: 65
                        }).then(ret3 => {
                            let $3 = cheerio.load(ret3.data);
                            $3('.table-striped tbody tr').each(function (i, elem) {
                                source.titles.push($3(this).find('td:nth-child(1) a:nth-child(1)').text());
                                source.magnets.push($3(this).find('td:nth-child(1) a:nth-child(2)').attr('data-clipboard-text'));
                                source.sizes.push($3(this).find('td:nth-child(2)').text());
                                source.dates.push($3(this).find('td:nth-child(3)').text());
                            });
                        }
                        ).catch(e => {
                            console.error(`${new Date().toLocaleString()} [error] searchAnimeStep3 ${e}`);
                        })
                    );
                }
            });

            await Promise.all(requestPromises).then(
                () => {
                    let flatSourceInfoList = infoParse(sourceInfoList);
                    console.log('解析后资源数量：' + flatSourceInfoList.length);
                    result = {
                        success: true,
                        subtitleGroupList: subtitleGroupList,
                        sourcelist: flatSourceInfoList,
                    };
                }
            ).catch(e => {
                console.error(`${new Date().toLocaleString()} [error] searchAnimeStep4 ${e}`);
                result = {
                    success: false,
                    err: '[searchAnime step4 error]' + e
                };
            });

        }
    ).catch(e => {
        console.error(`${new Date().toLocaleString()} [error] searchAnime step2 ${e}`);
        result = {
            success: false,
            err: '[searchAnime step2 error]' + e
        };
    });

    return result;
}


//处理数据，返回资源对象列表
function infoParse(rawInfoList) {
    let flatSourceInfoList = [];
    rawInfoList.forEach(rawInfo => {
        const { titles, dates, magnets, sizes } = rawInfo;
        for (let i = 0; i < rawInfo.titles.length; i++) {
            let animeInfo = {
                animeId: rawInfo.animeId,
                subtitleGroupId: rawInfo.subtitleGroupId,
                definition: '-',  //分辨率
                lanauage: '-',
                episode: '-',   //集数
                date: '-',   //资源发布日期
                magnet: '-',
                size: '-',
            };

            //词法分隔方式1
            let tinfo = titles[i].match(/(\[|\【).*?(\]|\】)/g);
            if (tinfo) {
                tinfo.forEach(t => {
                    if (t.search('1080') != -1) {
                        animeInfo.definition = '1080P'
                    } else if (t.search('720') != -1) {
                        animeInfo.definition = '720P'
                    };
                    if (/(\[|\【)\d{2}(-END)*(v2)*(\]|\】)/.exec(t)) {
                        animeInfo.episode = /(\[|\【)\d{2}(-END)*(v2)*(\]|\】)/.exec(t)[0].substr(1, 2);
                    } else if (/(\[|\【)\d{2}-\d{2}.*(\]|\】)/.exec(t)) {
                        animeInfo.episode = t.substr(1, 5);
                    } else if (/(\[|\【)\d{2}\+(\d{2}|SP)(\]|\】)/.exec(t)) {
                        animeInfo.episode = t.substr(1, 5);
                    } else if (/第\d{2}/.exec(t)) {
                        animeInfo.episode = /第\d{2}/.exec(t)[0].substr(2, 2);
                    };
                    if (t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1 || t.search('CHS') != -1) {
                        animeInfo.lanauage = 'sc'
                    } else if (t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1 || t.search('CHT') != -1) {
                        animeInfo.lanauage = 'tc'
                    } else if (t.search('简繁') != -1) {
                        animeInfo.lanauage = 'sc&tc'
                    };
                });
            }
            //采用词法分隔方式2
            if (animeInfo.definition == '-' || animeInfo.lanauage == '-' || animeInfo.episode == '-') {
                let tinfo2 = titles[i].trim().replace(/★/g, '').split(' ');
                if (tinfo2) {
                    tinfo2.forEach(t => {
                        if (animeInfo.definition == '-') {
                            if (t.search('1080') != -1) {
                                animeInfo.definition = '1080P'
                            } else if (t.search('720') != -1) {
                                animeInfo.definition = '720P'
                            }
                        }
                        if (animeInfo.lanauage == '-') {
                            if (t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1 || t.search('CHS') != -1) {
                                animeInfo.lanauage = 'sc'
                            } else if (t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1 || t.search('CHT') != -1) {
                                animeInfo.lanauage = 'tc'
                            } else if (t.search('简繁') != -1) {
                                animeInfo.lanauage = 'sc&tc'
                            }
                        }
                        if (animeInfo.episode == '-') {
                            if (/第\d{2}/.exec(t)) {
                                animeInfo.episode = /第\d{2}/.exec(t)[0].substr(1, 2);
                            } else if (/^(ep)*\d{2}$/i.exec(t)) {
                                animeInfo.episode = t;
                            } else if (/[0-5]\d[^a-zA-Z0-9]/.exec(t)) {
                                animeInfo.episode = /[0-5]\d[^a-zA-Z0-9]/.exec(t)[0].substr(0, 2);
                            }
                        }
                    });
                }
            }

            animeInfo.date = dates[i];
            animeInfo.magnet = magnets[i].match(/magnet:\?xt=urn:btih:[0-9a-zA-Z]{32,}/)[0];
            animeInfo.size = sizes[i];

            let repeat = false;;
            flatSourceInfoList.forEach(flatsource => {
                if (flatsource.magnet == animeInfo.magnet) {
                    repeat = true;
                }
            });
            if (!repeat) {
                flatSourceInfoList.push(animeInfo)
            }
        };

    });

    return flatSourceInfoList;
}


//处理数据，返回最新日期与集数
function getMaxDateAndEp(sourcelist) {
    let maxdate = '2000-01-01 00:00';
    let maxepisode = 0;
    let haveallepset = false;
    let epset = [];
    sourcelist.forEach(source => {
        if (source.date > maxdate) {
            maxdate = source.date;
        }
        let ep = 0;
        if (source.episode.search('-') != -1) {
            ep = source.episode.split('-')[1];
            if (ep == '12' || ep == '13' || ep == '26') {
                haveallepset = true;
                epset.push(source);
            }
        } else if (source.episode.search(/\+/) != -1) {
            ep = source.episode.split('+')[0];
        } else if (source.episode.search('ep') != -1) {
            ep = source.episode.substr(2, 2)
        } else {
            ep = source.episode;
        }
        if (ep > maxepisode) {
            maxepisode = ep;
        }
    })

    return {
        maxdate: maxdate,
        maxepisode: maxepisode,
        haveallepset: haveallepset,
        epset: epset
    }
}


//更新本地数据库资料
function updateSourceDb(animeId, maxdate, maxepisode, sourcelist) {

    let sql = new Yurusql();
    sql.getBangumiLatestEpAndDate(animeId).then(dbdata => {
        let dbdate = dbdata.date;
        if (dbdate < new Date(maxdate) || !dbdata) {
            sql.setBangumiLatestEpAndDate(sourcelist[0].animeId, maxdate, maxepisode);

            let willbeinsert = [];
            sourcelist.forEach(source => {
                if (new Date(source.date) > new Date(dbdate)) {
                    willbeinsert.push(source);
                }
            })
            console.log('willbeinsert:' + willbeinsert.length);
            for (let i = 0; i < willbeinsert.length; i++) {
                sql.addAnimeSourceInfo(willbeinsert[i]).then(
                    //() => console.log(`[${i}]source insert successfully`)
                ).catch(err => {
                    console.error(`[${i}]subtitleGroup insert ${err}`);
                });
            }
        }
    }).catch(err => {
        console.error(`updateSourceDb ${err}`);
    });;

}

function chooseSouece(state, tj) {
    let sourcelist = state.sourcelist;
    let sg = { id: 0 };
    let ep = state.dateandep.maxepisode;
    let defi = '0';
    let lang = 'sc';
    let hj = false;
    let reslist = [];
    try {
        if (tj == 'hj' || tj == '') {
            if (state.dateandep.haveallepset) {
                hj = true;
            }
        } else {
            let tjarr = tj.split(',');
            if (tjarr.length == 0 || !tjarr) {
                if (state.dateandep.haveallepset) {
                    hj = true;
                }
            } else {
                tjarr.forEach(t => {
                    if (/^sg\d$/.exec(t)) {
                        sg = state.subtitleGroupList[t.substr(2, 1) - 1]
                    };
                    if (/^ep\d\d$/.exec(t)) {
                        ep = t.substr(2, 2)
                    };
                    if (t.match(/^defi(720|1080)$/)) {
                        defi = t.match(/^defi(720|1080)$/)[1] + 'P'
                    };
                    if (t.match(/^lang(sc|tc)$/)) {
                        lang = t.match(/^lang(sc|tc)$/)[1]
                    };
                })
            }
        }
    } catch (err) {
        console.error('chooseSource ' + err);
        return {
            success: false
        }
    }

    console.log(`${sg.id},${ep},${defi},${lang},${hj}`);

    if (hj) {
        reslist.push(state.dateandep.epset[0], state.dateandep.epset[1])
    } else {
        sourcelist.forEach(source => {
            if ((sg.id == 0 || source.subtitleGroupId == sg.id) &&
                (source.episode.search(ep) != -1) &&
                (source.definition.toUpperCase() == defi || source.definition == '-' || defi == '0') &&
                (source.lanauage == lang || source.lanauage == '-')) {
                reslist.push(source);
            }
        })
    }
    //console.log(reslist);
    return {
        success: true,
        reslist: reslist
    }
}



export default MsgHandle;