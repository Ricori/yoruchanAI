import Axios from 'axios';
import cheerio from 'cheerio';
import replyText from '../replyTextConfig';
import config from '../config';
const setting = config.yuruConfig;
import Yurusql from './core/Yurusql';

async function searchAnime(context,searchAnimeName) {

    let msg = replyText.serchError;

    let sql = new Yurusql();

    console.log('搜索：' + searchAnimeName);

    let url = escape('https://mikanani.me/Home/Search?page=1&searchstr=' + searchAnimeName);
    await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url}&type=search`).then(
        async function step1(ret){
            if (ret.status == 200) {
                let $ = cheerio.load(ret.data);

                let bangumiList = [];
                $('.an-ul li a').each(function(i, elem) {
                    let bangumi = {
                        id : 0,
                        name : '',
                        url : ''
                    };
                    bangumi.id = $(this).attr('href').split('/')[3];
                    bangumi.name = $(this).find('.an-text').text();
                    bangumi.url = 'https://mikanani.me/Home/Bangumi/' + bangumi.id;
                    bangumiList.push(bangumi);
                });

                console.log(`寻找到${bangumiList.length}部番剧...`);
                if(bangumiList.length == 0){
                    msg = '夜夜酱没有找到相关的番剧，请主人尝试搜索关键词。'
                    return;
                }

                for (let i = 0; i < bangumiList.length; i++) {
                    sql.addBangumi(bangumiList[i]).then(
                        () => console.log(`[${i}] bangumi insert successfully`)
                    ).catch(
                        err => console.error(`[${i}] bangumi insert ${err}`)
                    );
                }

                /** 多部番剧时等待选择 */
                let chooseBangumiId;
                if(bangumiList.length == 1){
                    chooseBangumiId = 0;
                }else{
                    //todo..
                    chooseBangumiId = 1;
                }

                let chooseBangumi = bangumiList[chooseBangumiId];
                let url2 = escape(chooseBangumi.url);
                await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url2}&type=search`).then(
                    async function step1(ret2){
                        let $2 = cheerio.load(ret2.data);

                        let subtitleGroupList = [];
                        $2('.subgroup-text').each(function(i, elem) {
                            let subtitleGroup = {
                                id : 0,
                                sortid : 0,
                                name : ''
                            };
                            subtitleGroup.sortid = $2(this).attr('id');
                            if(subtitleGroup.sortid == 202){
                                subtitleGroup.id = 0;
                                subtitleGroup.name = '生肉/不明字幕组'
                            }else{
                                subtitleGroup.id = $2(this).find('a:nth-child(1)').attr('href').split('/')[3];
                                subtitleGroup.name = $2(this).find('a:nth-child(1)').text();
                            };
                            subtitleGroupList.push(subtitleGroup);
                        });

                        console.log(`共有${subtitleGroupList.length}个字幕组为本番制作字幕`);
                        for (let i = 0; i < subtitleGroupList.length; i++) {
                            sql.addSubtitleGroup(subtitleGroupList[i]).then(
                                () => console.log(`[${i}]subtitleGroup insert ok`)
                            ).catch(
                                err => console.error(`[${i}]subtitleGroup insert ${err}`)
                            );
                        }

                        let sourceInfoList = [];
                        $2('.table-striped tbody').each(function(i, elem) {
                            let sourceInfo = {
                                animeId : chooseBangumi.id,
                                subtitleGroupId : subtitleGroupList[i].id,
                                subtitleSortId : subtitleGroupList[i].sortid,
                                dates : [],
                                titles : [],
                                magnets : [],
                                sizes : [],
                            };
                            $2(this).find('tr').each(function(i, elem) {
                                sourceInfo.titles.push($(this).find('td:nth-child(1) a:nth-child(1)').text());
                                sourceInfo.magnets.push($(this).find('td:nth-child(1) a:nth-child(2)').attr('data-clipboard-text'));
                                sourceInfo.sizes.push($(this).find('td:nth-child(2)').text());
                                sourceInfo.dates.push($(this).find('td:nth-child(3)').text());
                            });
                            sourceInfoList.push(sourceInfo);
                        });


                        let requestPromises = [];
                        sourceInfoList.forEach(source => {
                            if(source.titles.length == 15){
                                requestPromises.push(
                                    Axios.post('https://mikanani.me/Home/ExpandEpisodeTable',{
                                        bangumiId : source.animeId,
                                        subtitleGroupId : source.subtitleSortId,
                                        take : 65
                                    }).then(ret3 => {
                                            let $3 = cheerio.load(ret3.data);
                                            $3('.table-striped tbody tr').each(function(i, elem) {
                                                source.titles.push($(this).find('td:nth-child(1) a:nth-child(1)').text());
                                                source.magnets.push($(this).find('td:nth-child(1) a:nth-child(2)').attr('data-clipboard-text'));
                                                source.sizes.push($(this).find('td:nth-child(2)').text());
                                                source.dates.push($(this).find('td:nth-child(3)').text());
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
                                console.log('解析后资源数量：'+ flatSourceInfoList.length);

                                for (let i = 0; i < flatSourceInfoList.length; i++) {
                                    sql.addAnimeSourceInfo(flatSourceInfoList[i]).then(
                                        () => console.log(`[${i}]source insert ok`)
                                    ).catch(
                                        err => console.error(`[${i}]source insert ${err}`)
                                    );
                                }

                                msg = 'ok';
                            }                            
                        ).catch(e => { 
                            console.error(`${new Date().toLocaleString()} [error] searchAnimeStep4 ${e}`);
                        });
                    }
                ).catch(e => {
                    console.error(`${new Date().toLocaleString()} [error] searchAnimeStep2 ${e}`);
                });

            }
        }
    ).catch(e => {
		console.error(`${new Date().toLocaleString()} [error] searchAnime ${e}`);
	});

    setTimeout(() => sql.close(),3000);
    return msg;
}



//处理数据，返回资源对象列表
function infoParse(rawInfoList){

    let flatSourceInfoList = [];
    rawInfoList.forEach( rawInfo => {
        const { titles, dates, magnets, sizes } = rawInfo;

        for(let i = 0;i < rawInfo.titles.length; i++){
            let animeInfo = {
                animeId : rawInfo.animeId,
                subtitleGroupId : rawInfo.subtitleGroupId,
                definition : '-',  //分辨率
                lanauage : '-',
                episode : '-',   //集数
                date : '-',   //资源发布日期
                magnet : '-',
                size : '-',
            };
    
            //词法分隔方式1
            let tinfo = titles[i].match(/(\[|\【).*?(\]|\】)/g);
            tinfo.forEach( t => {
                if(t.search('1080') != -1){
                    animeInfo.definition = '1080P'
                }else if(t.search('720') != -1){
                    animeInfo.definition = '720P'
                };
                if(/(\[|\【)\d{2}(-END)*(v2)*(\]|\】)/.exec(t)){
                    animeInfo.episode = /(\[|\【)\d{2}(-END)*(v2)*(\]|\】)/.exec(t)[0].substr(1,2);
                }else if(/(\[|\【)\d{2}-\d{2}.*(\]|\】)/.exec(t)){
                    animeInfo.episode = t.substr(1,5);
                }else if(/(\[|\【)\d{2}\+(\d{2}|SP)(\]|\】)/.exec(t)){
                    animeInfo.episode = t.substr(1,5);
                }else if(/第\d{2}/.exec(t)){
                    animeInfo.episode = /第\d{2}/.exec(t)[0].substr(2,2);
                };
                if(t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1 || t.search('CHS') != -1){
                    animeInfo.lanauage = 'sc'
                }else if(t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1 || t.search('CHT') != -1){
                    animeInfo.lanauage = 'tc'
                }else if(t.search('简繁') != -1){
                    animeInfo.lanauage = 'sc&tc'
                };
            });
    
            //采用词法分隔方式2
            if(animeInfo.definition == '-' || animeInfo.lanauage == '-' || animeInfo.episode == '-'){
                let tinfo2 = titles[i].trim().replace(/★/g,'').split(' ');
                tinfo2.forEach( t => {
                    if(animeInfo.definition == '-'){
                        if(t.search('1080') != -1){
                            animeInfo.definition = '1080P'
                        }else if(t.search('720') != -1){
                            animeInfo.definition = '720P'
                        }
                    }
                    if(animeInfo.lanauage == '-'){
                        if(t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1 || t.search('CHS') != -1){
                            animeInfo.lanauage = 'sc'
                        }else if(t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1 || t.search('CHT') != -1 ){
                            animeInfo.lanauage = 'tc'
                        }else if(t.search('简繁') != -1){
                            animeInfo.lanauage = 'sc&tc'
                        }
                    }
                    if(animeInfo.episode == '-'){
                        if(/第\d{2}/.exec(t)){
                            animeInfo.episode = /第\d{2}/.exec(t)[0].substr(1,2);
                        }else if(/^(ep)*\d{2}$/i.exec(t)){
                            animeInfo.episode = t;
                        }else if(/[0-5]\d\D/.exec(t)){
                            animeInfo.episode = /[0-5]\d\D/.exec(t)[0].substr(0,2);
                        }
                    }
                });
            }
    
            animeInfo.date = dates[i];
            animeInfo.magnet = magnets[i].match(/magnet:\?xt=urn:btih:[0-9a-zA-Z]{32,}/)[0];
            animeInfo.size = sizes[i];
            flatSourceInfoList.push(animeInfo);
        };
    
    });

    return flatSourceInfoList;
}



export default searchAnime;