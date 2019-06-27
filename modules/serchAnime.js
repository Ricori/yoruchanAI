import Axios from 'axios';
import cheerio from 'cheerio';

import replyText from '../replyTextConfig';

import config from '../config';

const setting = config.yuruConfig;

import Yurusql from './core/Yurusql';

async function searchAnime(context) {

    let msg = replyText.serchError;
    let searchAnimeName = '淫乱'.toUpperCase();
    let url = escape('https://mikanani.me/Home/Search?page=1&searchstr=' + searchAnimeName);
    await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url}&type=search`).then(
        ret =>  {
            if (ret.status == 200) {
                let $ = cheerio.load(ret.data);
                let rawInfo = {
                    dates : [],
                    titles : [],
                    magnets : [],
                    sizes : [],
                }
                $('.table-striped tbody .js-search-results-row').each(function(i, elem) {
                    rawInfo.titles.push($(this).find('td:nth-child(1) a:nth-child(1)').text());
                    rawInfo.magnets.push($(this).find('td:nth-child(1) a:nth-child(2)').attr('data-clipboard-text'));
                    rawInfo.sizes.push($(this).find('td:nth-child(2)').text());
                    rawInfo.dates.push($(this).find('td:nth-child(3)').text());
                });

                let animeInfoList = infoParse(rawInfo,searchAnimeName);

                let sql = new Yurusql();
                for (let i = 0; i < animeInfoList.length; i++) {
                    sql.addAnimeInfo(animeInfoList[i]).then(
                        () => {
                            console.log(`[${i}] insert ok`);
                            if(i == animeInfoList.length-1){
                                setTimeout(() => sql.close(),2000)
                            }
                        }
                    ).catch(
                        err => console.error(`[${i}] insert ${err}`)
                    );
                }

                //console.log(animeInfoList);
                
                msg = 'ok';
                return msg;
            }
        }
    ).catch(e => {
		console.error(`${new Date().toLocaleString()} [error] searchAnime ${e}`);
	});

    return msg;
}



//处理数据，返回动画对象列表
function infoParse(rawInfo,searchAnimeName){
    const { titles, dates, magnets, sizes } = rawInfo;
    let animeInfoList = [];
    for(let i = 0;i < rawInfo.titles.length; i++){
        let animeInfo = {
            animeName : '-', 
            subtitleGroup : '-',
            definition : '-',  //分辨率
            lanauage : '-',
            episode : '-',   //集数
            date : '-',   //资源发布日期
            magnet : '-',
            size : '-',
        };

        //词法分隔方式1
        let tinfo = titles[i].match(/([\[,\【].*?[\],\】])?/g);
        tinfo.forEach( t => {
            if(/.*(字幕组|奶茶屋|字幕社|汉化组|学园|Team|动漫组|House|搬运)/.exec(t)){
                animeInfo.subtitleGroup = t.substr(1,t.length-2);
            };
            if(t.search(searchAnimeName) != -1 || t.search(searchAnimeName.toLowerCase()) != -1){
                animeInfo.animeName = t.substr(1,t.length-2);
            }
            if(t.search('1080') != -1){
                animeInfo.definition = '1080P'
            }else if(t.search('720') != -1){
                animeInfo.definition = '720P'
            };
            if(/[\[,\【]\d{2}[\],\】]/.exec(t)){
                animeInfo.episode = t.substr(1,2);
            };
            if(t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1){
                animeInfo.lanauage = 'sc'
            }else if(t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1){
                animeInfo.lanauage = 'tc'
            };
        });

        //采用词法分隔方式2
        if(animeInfo.animeName == '-' || animeInfo.subtitleGroup == '-' || animeInfo.definition == '-'
            || animeInfo.lanauage == '-' || animeInfo.episode == '-'){
            let tinfo2 = titles[i].trim().replace(/★/g,'').split(' ');
            tinfo2.forEach( t => {
                if(animeInfo.subtitleGroup == '-'){
                    if(/.*(字幕组|奶茶屋|字幕社|汉化组|学园|Team|动漫组|House|搬运)/.exec(t)){  
                        animeInfo.subtitleGroup = t.substr(1,t.length-2);
                    }
                }
                if(animeInfo.animeName == '-'){
                    if(t.search(searchAnimeName) != -1 || t.search(searchAnimeName.toLowerCase()) != -1){
                        animeInfo.animeName = t;
                    }
                }
                if(animeInfo.definition == '-'){
                    if(t.search('1080') != -1){
                        animeInfo.definition = '1080P'
                    }else if(t.search('720') != -1){
                        animeInfo.definition = '720P'
                    }
                }
                if(animeInfo.lanauage == '-'){
                    if(t.search('简体') != -1 || t.search('简中') != -1 || t.search('GB') != -1){
                        animeInfo.lanauage = 'sc'
                    }else if(t.search('繁体') != -1 || t.search('繁中') != -1 || t.search('BIG5') != -1){
                        animeInfo.lanauage = 'tc'
                    }
                }
                if(animeInfo.episode == '-'){
                    if(/第\d{2}/.exec(t)){
                        animeInfo.episode = t.substr(1,2);
                    }else if(/\d{2}/.exec(t) && t.search('p') == -1 && t.search('P') == -1){
                        animeInfo.episode = t;
                    }
                }
            });
        }
        //还是缺少动画名称 直接丢弃
        if(animeInfo.animeName == '-'){
            continue;
        }

        animeInfo.date = dates[i];
        animeInfo.magnet = magnets[i].match(/magnet:\?xt=urn:btih:[0-9a-zA-Z]{32,}/)[0];
        animeInfo.size = sizes[i];
        animeInfoList.push(animeInfo);
    };

    return animeInfoList;
}



export default searchAnime;