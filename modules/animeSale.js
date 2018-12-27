import Axios from 'axios';

/**
 * 名作之壁搜索
* @param {string} time 年月
 */
async function doSearch(time) {

    if(!time) time = '2018-10';

    const apiurl = 'https://mingzuozhibi.com/api/sakuras/key/Z-'+ time +'/discs?discColumns=todayPt,totalPt,guessPt,titlePc';
    let msg = "夜夜没能找到相关信息呢，可能是网络接口被玩坏了T T"; //返回消息

    //console.log(apiurl);

    await Axios.get(apiurl).then(
        ret =>  {
            if (ret.status == 200) {
                let data = ret.data.data;

                if(!data) return;

                let title = '截至 ' + new Date().toLocaleString() + '\n' + data.title + '销量统计\n';
                
                let discs = data.discs;
                discs.sort(function(a,b){
                    if(a.guessPt < b.guessPt){
                        return 1;
                    }
                    if(a.guessPt > b.guessPt){
                        return -1;
                    }
                    return 0;
                })

                msg = title + '番剧名称  预测pt  当前pt  今日日增\n';
                for(let i = 0 ;i < 18; i++){
                    msg += '《' + discs[i].titlePc + '》  ';
                    msg += discs[i].guessPt + '  ';
                    msg += discs[i].totalPt + '  ';
                    msg += (discs[i].todayPt ? discs[i].todayPt:'无数据') + '\n';
                }

                return msg;
            }
        }
    ).catch(e => {
		console.error(`${new Date().toLocaleString()} [error] AnimeSale ${e}`);
	});

    return msg;
}





export default doSearch;