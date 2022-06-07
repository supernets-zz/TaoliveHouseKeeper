var workToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const signTag = "打工赚元宝首页签到";
const browseTag = "打工赚元宝浏览首页";
const marketTag = "打工赚元宝浏览旺市";

workToEarn.dailyJobs = [];
workToEarn.dailyJobs.push(signTag);
workToEarn.dailyJobs.push(browseTag);
workToEarn.dailyJobs.push(marketTag);

gotoWorkEarnCoins = function () {
    var workBtn = null;
    if (!commonAction.gotoCoinCenter()) {
        return workBtn;
    }

    workBtn = common.waitForText("text", "打工赚元宝", true, 10);
    if (workBtn == null) {
        return workBtn;
    }

    var clickRet = click(workBtn.bounds().centerX(), workBtn.bounds().centerY() - workBtn.bounds().height() * 3);
    log("点击 打工赚元宝: " + clickRet);
    if (clickRet == false) {
        return workBtn;
    }

    //"去打工赚钱"在工作的时候不会出现，但"连续签到..."一定存在
    workBtn = common.waitForTextMatches(/连续签到 \d\/7 天 拿大礼包/, true, 10);
    if (workBtn == null) {
        return workBtn;
    }
    return workBtn;
}

collectStrength = function (signTips) {
    // 不管三七二十一，点一下收集体力
    log("点击 收集体力: " + click(signTips.bounds().width() / 4, signTips.bounds().centerY() - signTips.bounds().height() * 3));
    sleep(1000);

    common.safeSet(common.lastWorkToEarnCollectTag, Math.floor(new Date().getTime() / 1000));

    // 要么出提示，要么弹任务框
    var getBtn = textMatches(/去领体力/).findOne(1000);
    if (getBtn != null) {
        var objs = [];
        common.queryList(getBtn.parent().parent(), 0, objs);
        log(getBtn.text() + " 关闭: " + click(objs[1].bounds().centerX(), objs[1].bounds().centerY()));
    } else {
        sleep(3000);
    }

    //打工完成了先点击领取元宝，再选工作继续打工赚钱
    var getBtn = textMatches(/领取\d+元宝/).visibleToUser(true).findOne(1000);
    if (getBtn != null) {
        log("点击 " + getBtn.text() + ": " + getBtn.click());
        sleep(1000);
        var getTips = text("恭喜获得元宝").findOne(1000);
        if (getTips != null) {
            var objs = [];
            queryList(getTips.parent(), 0, objs);
            log("点击 关闭: " + objs[0].click());
            sleep(1000);
        }
    }

    // 去打工赚钱 按钮
    var workBtn = text("去打工赚钱").visibleToUser(true).findOne(1000);
    if (workBtn == null) {
        log("打工ing...");
        return;
    }

    log("点击 去打工赚钱: " + workBtn.click());
    var workChoice = common.waitForText("text", "选工作 赚元宝", true, 10);
    if (workChoice == null) {
        return;
    }

    var objs = [];
    common.queryList(workChoice.parent(), 0, objs);
    //开始打工按钮
    var startBtn = objs[2];

    var jobs = textMatches(/歌手|厨师|带货/).visibleToUser(true).find();
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].text() == "厨师") { //每100体力产出的元宝最高，体力不足时等待体力足了再工作
            log("点击 " + jobs[i].text() + ": " + click(jobs[i].bounds().centerX(), jobs[i].bounds().centerY()));
            sleep(1000);
            //体力不足时选择高体力职业按钮文字会提示体力不足
            log("选择打工类型后开始按钮文字: " + startBtn.text());
            if (startBtn.text() == "开始打工") {
                log("点击 " + startBtn.text() + ": " + startBtn.click());
                sleep(1000);
            }

            //不管能否成功打工，点击"选工作 赚元宝"上面一点关闭工作选择弹窗
            log("关闭工作选择提示: " + click(workChoice.bounds().centerX(), workChoice.bounds().centerY() - workChoice.bounds().height() * 4));
            sleep(1000);
            break;
        }
    }
}

workToEarn.doWorkDailySign = function () {
    log("doWorkDailySign");
    // 我的-> 元宝中心-> 打工赚元宝
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + signTag);
    if (done != null) {
        log(signTag + " 已做: " + done);
        return;
    }

    toast("doWorkDailySign");
    if (gotoWorkEarnCoins() == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    var tips = textMatches(/连续签到 \d\/7 天 拿大礼包/).findOne(1000);
    if (tips == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    if (tips.text().indexOf("6/7") != -1) {
        common.safeSet(nowDate + ":" + signTag, "no need");
        toastLog("不领元宝券 " + signTag);
    }

    //打工签到
    var objs = [];
    common.queryList(tips.parent(), 0, objs);
    if (objs[1].text() == "已签到") {
        common.safeSet(nowDate + ":" + signTag, "done");
        toastLog("已签到 " + signTag);
    } else {
        var clickRet = objs[1].click();
        log("签到 :" + clickRet);
        if (clickRet) {
            common.safeSet(nowDate + ":" + signTag, "done");
            toastLog("完成 " + signTag);
        }
    }

    commonAction.backTaoliveMainPage();
}

workToEarn.doWorkMainBrowse = function () {
    log("doWorkMainBrowse");
    // 我的-> 元宝中心-> 打工赚元宝，先上划个半屏，看有没有浏览商品30秒 +100体力，有就做，没有拉倒
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + browseTag);
    if (done != null) {
        log(browseTag + " 已做: " + done);
        return;
    }

    toast("doWorkMainBrowse");
    if (gotoWorkEarnCoins() == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    sleep(1000);
    log("往上划动半个屏幕: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
    var walkTips = textContains("浏览商品").findOne(1000);
    if (walkTips != null) {
        log("等待 商品 浏览完成，360s超时");
        var ret = commonAction.scrollThrough("浏览商品", 360);
        if (ret) {
            common.safeSet(nowDate + ":" + browseTag, "done");
            toastLog("完成 " + browseTag);
        } else {
            toastLog("360s timeout");
        }
    } else {
        common.safeSet(nowDate + ":" + browseTag, "none");
        toastLog("无 " + browseTag);
    }

    commonAction.backTaoliveMainPage();
}

workToEarn.doWorkMarketBrowse = function () {
    log("doWorkMarketBrowse");
    // 我的-> 元宝中心-> 打工赚元宝
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + marketTag);
    if (done != null) {
        log(marketTag + " 已做: " + done);
        return;
    }

    toast("doWorkMarketBrowse");
    if (gotoWorkEarnCoins() == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    var browseTaskList = [];
    var marketTips = textContains("浏览旺市").findOne(1000);
    if (marketTips != null && marketTips.bounds().height() > 10) {
        var obj = {};
        obj.Title = marketTips.text();
        obj.BtnName = "去完成";
        obj.Button = marketTips;
        browseTaskList.push(obj);
        if (commonAction.doBrowseTasks(browseTaskList)) {
            common.safeSet(nowDate + ":" + marketTag, "done");
            toastLog("完成 " + marketTag);
        }
    } else {
        common.safeSet(nowDate + ":" + marketTag, "none");
        toastLog("无 " + marketTag);
    }

    commonAction.backTaoliveMainPage();
}

//打工赚元宝周期任务
workToEarn.doWorkRoutineTasks = function () {
    log("doWorkRoutineTasks");
    // 我的-> 元宝中心-> 打工赚元宝
    // 根据连续签到提示确定"收集体力"与"赚体力"两个图片按钮的坐标
    var signTips = gotoWorkEarnCoins();
    if (signTips == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    collectStrength(signTips);

    //赚体力按钮坐标
    var earnStrengthBtnX = device.width - signTips.bounds().width() / 4;
    var earnStrengthBtnY = signTips.bounds().centerY() - signTips.bounds().height() * 3;
    for (;;) {
        clickRet = click(earnStrengthBtnX, earnStrengthBtnY);
        log("点击 赚体力(" + earnStrengthBtnX + ", " + earnStrengthBtnY + "): " + clickRet);
        if (clickRet == false) {
            commonAction.backTaoliveMainPage();
            return;
        }

        var taskDetails = common.waitForText("text", "得体力", true, 10);
        if (taskDetails == null) {
            commonAction.backTaoliveMainPage();
            return;
        }

        var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
        var searchTaskList = [];    //搜索任务列表，搜索后返回
        var watchTaskList = [];     //观看任务列表，需要多次折返
        var validTaskNames = [];
        var totalTasks = packageName(common.taolivePackageName).text("得体力").find();
        var validTasks = packageName(common.taolivePackageName).text("得体力").visibleToUser(true).find();

        for (var i = 0; i < validTasks.length; i++) {
            var objs = [];
            common.queryList(validTasks[i].parent(), 0, objs);
            if (objs.length == 7 && objs[5].bounds().height() > 50 || objs.length == 6 && objs[4].bounds().height() > 50) {
                validTaskNames.push(objs[0].text());
            }
        }
        toastLog("任务数: " + totalTasks.length + ", 可见: " + validTaskNames.length + ", " + validTaskNames);

        if (totalTasks.length == 0) {
            captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
            break;
        }

        totalTasks.forEach(function(tv) {
            var objs = [];
            var title = "";
            var btn = null;
            common.queryList(tv.parent(), 0, objs);
            title = objs[0].text();
            if (objs.length == 7) {
                btn = objs[5];
            } else if (objs.length == 6) {
                btn = objs[4];
            } else {
                for (var k = 0;k < objs.length; k++) {
                    log("第" + k + "个子控件" + objs[k]);
                }
            }
            if (btn != null) {
                if (/去完成|去浏览/.test(btn.text()) && 
                    title.indexOf("邀请") == -1 && 
                    title.indexOf("支付宝") == -1 && 
                    title.indexOf("人脉价值") == -1 &&
                    title.indexOf("真香秒杀") == -1) {
                    var obj = {};
                    obj.Title = title;
                    obj.BtnName = btn.text();
                    obj.Button = btn;
                    if (obj.Title.indexOf("浏览") != -1) {
                        browseTaskList.push(obj);
                    } else if (obj.Title.indexOf("搜索") != -1) {
                        searchTaskList.push(obj);
                    } else {
                        watchTaskList.push(obj);
                    }
                    log("未完成任务" + (browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + ")");
                } else {
                    log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + ")");
                }
            }
        });

        if (browseTaskList.length + searchTaskList.length + watchTaskList.length == 0) {
            break;
        }

        browseTaskList = common.filterTaskList(browseTaskList, validTaskNames)
        if (commonAction.doBrowseTasks(browseTaskList)) {
            //等待成功提示消失
            sleep(3000);
            continue;
        }

        searchTaskList = common.filterTaskList(searchTaskList, validTaskNames)
        if (commonAction.doSearchTasks(searchTaskList)) {
            //等待成功提示消失
            sleep(3000);
            continue;
        }

        watchTaskList = common.filterTaskList(watchTaskList, validTaskNames)
        var lastWalkToEarnCollectTimestamp = common.safeGet(common.lastWalkToEarnCollectTag);
        log("上次走路赚元宝采集时间戳: " + common.timestampToTime(lastWalkToEarnCollectTimestamp * 1000) + ", watchTaskList: " + watchTaskList.length);
        if (watchTaskList.length > 0 && new Date().getTime() / 1000 - lastWalkToEarnCollectTimestamp > common.lastCollectTimeout) {
            log("暂停观看视频任务，先去 走路赚元宝 领步数");
            break;
        }
        if (commonAction.doWatchTasks(watchTaskList)) {
            //等待成功提示消失
            sleep(3000);
            continue;
        }
    }

    commonAction.backTaoliveMainPage();
}

module.exports = workToEarn;