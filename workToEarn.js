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
    if (!commonAction.gotoCoinCenter()) {
        return null;
    }

    var workBtn = common.waitForText("text", "打工赚元宝", true, 10);
    if (workBtn == null) {
        return null;
    }

    var clickRet = workBtn.parent().click();
    log("点击 打工赚元宝: " + clickRet);
    if (clickRet == false) {
        return null;
    }

    //按钮"去打工赚钱"在工作的时候不会出现，但"连续签到..."一定存在
    var signTips = common.waitForTextMatches(/连续签到 \d\/7 天 拿大礼包/, true, 10);
    return signTips;
}

//领体力
//0秒       100体力
//30秒      75体力
//1分钟     50体力
//1分30秒   50体力
//3分钟     75体力
//5分钟     100体力
//10分钟    100体力
//30分钟    175体力
//1小时     300体力
//3小时     1000体力
collectStrength = function () {
    //签到提示
    var signTips = textMatches(/连续签到 \d\/7 天 拿大礼包/).findOne(1000);
    if (signTips == null) {
        return;
    }

    sleep(2000);
    //体力值
    var strengthBalance = 0
    var exchangeBtn = text("兑换").findOne(1000);
    if (exchangeBtn != null) {
        strengthBalance = parseInt(exchangeBtn.parent().child(4).text());
    }
    log("体力值: " + strengthBalance);

    //领取体力、打工、赚体力的父节点
    log("signTips.parent().childCount(): " + signTips.parent().childCount());
    log("signTips.parent().parent().childCount(): " + signTips.parent().parent().childCount());
    log("signTips.parent().parent().parent().childCount(): " + signTips.parent().parent().parent().childCount());
    var threeBtnsBar = signTips.parent().parent().parent().child(0);
    var getStrengthBtn = threeBtnsBar.child(0);
    var canGetStrength = "";    // 体力领完了就没有了
    if (getStrengthBtn.child(0).className() == "android.view.View") {
        canGetStrength = getStrengthBtn.child(0).text();
    }
    log(canGetStrength);
    var strengthLeftTime = "";
    for (var i = 1; i < getStrengthBtn.childCount(); i++) {
        if (getStrengthBtn.child(i).className() == "android.view.View") {
            strengthLeftTime = strengthLeftTime + getStrengthBtn.child(i).text();
        }
    }
    var workBtn = threeBtnsBar.child(1);
    var earnBtn = threeBtnsBar.child(2);

    if (/\d+:\d+:\d+/.test(strengthLeftTime)) {
        log(strengthLeftTime + " 后 " + canGetStrength);
    } else if (strengthLeftTime == "去领取") {
        log("点击 收集体力: " + getStrengthBtn.click());
        // 要么出提示，不需要点击，要么弹任务框需要点击关闭
        var getStrengthTips = textMatches(/去领体力/).findOne(5000);
        if (getStrengthTips != null) {
            var dlgCloseBtn = getStrengthTips.parent().parent().child(1);
            log(getStrengthTips.text() + " 关闭: " + click(dlgCloseBtn.bounds().centerX(), dlgCloseBtn.bounds().centerY()));
            sleep(1000);
        }
        strengthBalance = parseInt(exchangeBtn.parent().child(4).text());
        log("新体力值: " + strengthBalance);
    } else {
        log("体力剩余时间: " + strengthLeftTime);
    }

    strengthLeftTime = "";
    getStrengthBtn = threeBtnsBar.child(0);
    for (var i = 1; i < getStrengthBtn.childCount(); i++) {
        if (getStrengthBtn.child(i).className() == "android.view.View") {
            strengthLeftTime = strengthLeftTime + getStrengthBtn.child(i).text();
        }
    }

    log("下次领取体力剩余时间: " + strengthLeftTime);
    var curDate = new Date().Format("yyyy/MM/dd");
    var newNextWorkCheckTimestamp = new Date(curDate + " 24:00:00").getTime();
    if (/\d+:\d+:\d+/.test(strengthLeftTime)) {
        var HHmmss = strengthLeftTime.match(/\d+/g);
        newNextWorkCheckTimestamp = new Date().getTime() + (parseInt(HHmmss[0]) * 3600 + parseInt(HHmmss[1]) * 60 + parseInt(HHmmss[2])) * 1000;
    }
    common.safeSet(common.nextWorkCheckTimestampTag, newNextWorkCheckTimestamp);
    log(common.nextWorkCheckTimestampTag + " 设置为: " + common.timestampToTime(newNextWorkCheckTimestamp));

    //打工完成了先点击领取元宝，再选工作继续打工赚钱
    if (/领取\d+元宝/.test(workBtn.text())) {
        log("点击 " + workBtn.text() + ": " + workBtn.click());
        sleep(1000);
        //弹出领取成功对话框，点击关闭
        var getTips = text("恭喜获得元宝").findOne(1000);
        if (getTips != null) {
            log("点击 关闭: " + getTips.parent().child(0).click());
            sleep(1000);
        }
    }

    if (workBtn.text() == "去打工赚钱") {
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
        commonAction.backToAppMainPage();
        return;
    }

    var tips = textMatches(/连续签到 \d\/7 天 拿大礼包/).findOne(1000);
    if (tips == null) {
        commonAction.backToAppMainPage();
        return;
    }

    if (tips.text().indexOf("6/7") != -1) {
        common.safeSet(nowDate + ":" + signTag, "no need");
        toastLog("不领元宝券 " + signTag);
    } else {
        //打工签到
        var signBtn = tips.parent().child(1);
        if (signBtn.text() == "已签到") {
            common.safeSet(nowDate + ":" + signTag, "done");
            toastLog("已签到 " + signTag);
        } else {
            var clickRet = signBtn.click();
            log("签到 :" + clickRet);
            if (clickRet) {
                common.safeSet(nowDate + ":" + signTag, "done");
                toastLog("完成 " + signTag);
            }
        }
    }

    commonAction.backToAppMainPage();
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
        commonAction.backToAppMainPage();
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

    commonAction.backToAppMainPage();
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
        commonAction.backToAppMainPage();
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

    commonAction.backToAppMainPage();
}

//打工赚元宝周期任务
workToEarn.doWorkRoutineTasks = function () {
    log("doWorkRoutineTasks");
    // 我的-> 元宝中心-> 打工赚元宝
    // 根据连续签到提示确定"收集体力"与"赚体力"两个图片按钮的坐标
    var signTips = gotoWorkEarnCoins();
    if (signTips == null) {
        commonAction.backToAppMainPage();
        return;
    }

    collectStrength();

    //赚体力按钮坐标
    //领取体力、打工、赚体力的父节点
    var threeBtnsBar = signTips.parent().parent().parent().child(0);
    var earnBtn = threeBtnsBar.child(2);
    for (;;) {
        var clickRet = earnBtn.click();
        log("点击 赚体力: " + clickRet);
        if (clickRet == false) {
            commonAction.backToAppMainPage();
            return;
        }
        sleep(1000);

        var taskDetails = common.waitForText("text", "得体力", true, 10);
        if (taskDetails == null) {
            commonAction.backToAppMainPage();
            return;
        }

        for (;;) {
            var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
            var searchTaskList = [];    //搜索任务列表，搜索后返回
            var watchTaskList = [];     //观看任务列表，需要多次折返
            var validTaskNames = [];
            var totalTasks = packageName(common.destPackageName).text("得体力").find();
            var validTasks = packageName(common.destPackageName).text("得体力").visibleToUser(true).find();

            for (var i = 0; i < validTasks.length; i++) {
                var taskItem = validTasks[i].parent();
                var btn = taskItem.child(taskItem.childCount() - 2);
                if (btn.bounds().height() > 50) {
                    validTaskNames.push(taskItem.child(0).text());
                }
            }
            toastLog("任务数: " + totalTasks.length + ", 可见: " + validTaskNames.length + ", " + validTaskNames);

            if (totalTasks.length == 0) {
                captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
                commonAction.backToAppMainPage();
                return;
            }

            var canWatch = common.canWatch();
            log("canWatch: " + canWatch);
            totalTasks.forEach(function(tv) {
                var taskItem = tv.parent();
                var title = taskItem.child(0).text();
                var btn = taskItem.child(taskItem.childCount() - 2);
                if (btn != null) {
                    if (/去完成|去浏览|去观看/.test(btn.text()) && 
                        title.indexOf("邀请") == -1 && 
                        title.indexOf("支付宝") == -1 && 
                        title.indexOf("人脉价值") == -1 &&
                        title.indexOf("真香秒杀") == -1 &&
                        title.indexOf("评论") == -1 &&
                        title.indexOf("淘特") == -1) {
                        var obj = {};
                        obj.Title = title;
                        obj.BtnName = btn.text();
                        obj.Button = btn;
                        if (obj.Title.indexOf("浏览") != -1) {
                            browseTaskList.push(obj);
                        } else if (obj.Title.indexOf("搜索") != -1) {
                            searchTaskList.push(obj);
                        } else if ((obj.Title.indexOf("直播") != -1 || obj.Title.indexOf("视频") != -1 || obj.Title.indexOf("分钟") != -1) && canWatch) {
                            watchTaskList.push(obj);
                        }
                        log("未完成任务" + (browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + "), " + obj.Button.bounds().height());
                    } else {
                        log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + "), " + btn.bounds().height());
                    }
                }
            });

            var uncompleteTaskNum = browseTaskList.length + searchTaskList.length + watchTaskList.length;
            log("未完成任务数: " + uncompleteTaskNum);
            if (uncompleteTaskNum == 0) {
                commonAction.backToAppMainPage();
                return;
            }

            browseTaskList = common.filterTaskList(browseTaskList, validTaskNames)
            if (commonAction.doBrowseTasks(browseTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }

            searchTaskList = common.filterTaskList(searchTaskList, validTaskNames)
            if (commonAction.doSearchTasks(searchTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }

            watchTaskList = common.filterTaskList(watchTaskList, validTaskNames)
            if (commonAction.doWatchTasks(watchTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }

            log("上划任务列表: " + swipe(device.width / 5, device.height * 13 / 16, device.width / 5, device.height * 11 / 16, 200));
        }
    }
}

module.exports = workToEarn;