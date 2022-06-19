var sleepToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const browseTag = "睡觉赚元宝浏览首页"; //不一定有，不能列入每日任务中
const sleepTag = "睡觉赚元宝去睡觉";    //每晚21:00至次日3:00
const wakeupTag = "睡觉赚元宝我醒来啦"; //次日06:00至20:59，同连续3天完成睡觉任务领取福袋

gotoSleepEarnCoins = function () {
    if (!commonAction.gotoCoinCenter()) {
        return null;
    }

    var btnSleep = null;
    for (var i = 0; i < 10; i++) {
        btnSleep = text("去睡觉").visibleToUser(true).findOne(1000);
        if (btnSleep == null || btnSleep != null && btnSleep.bounds().height() < 42) {
            log("上划屏幕找 去睡觉: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
            sleep(1000);
            continue;
        }
        break;
    }

    if (btnSleep == null) {
        return null;
    }

    log("点击 去睡觉: " + click(btnSleep.bounds().centerX(), btnSleep.bounds().centerY()));

    //提示语"Hi，欢迎来领元宝...|Hi，上午好"
    // var timeTips = common.waitForTextMatches(/现在是\d+月\d+日.*/, true, 10);
    var welcomeTips = common.waitForText("text", "睡觉记录", true, 10);
    return welcomeTips;
}

getSleepTag = function () {
    var yesterday = new Date();
    var tomorrow = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (common.checkAuditTime("21:00", "24:00")) {
        var nowDate = new Date().Format("yyyy-MM-dd");
        var nextDate = tomorrow.Format("yyyy-MM-dd");
        var done1 = common.safeGet(nowDate + ":night:" + sleepTag);
        var done2 = common.safeGet(nextDate + ":midnight:" + sleepTag);
        log(nowDate + ":night:" + sleepTag + ": " + done1 + ", " + nextDate + ":midnight:" + sleepTag + ": " + done2);
        if (done1 != null && done2 != null) {
            return "done";
        } else {
            return null;
        }
    } else if (common.checkAuditTime("00:00", "03:00")) {
        var nowDate = new Date().Format("yyyy-MM-dd");
        var lastDate = yesterday.Format("yyyy-MM-dd");
        var done1 = common.safeGet(lastDate + ":night:" + sleepTag);
        var done2 = common.safeGet(nowDate + ":midnight:" + sleepTag);
        log(lastDate + ":night:" + sleepTag + ": " + done1 + ", " + nowDate + ":midnight:" + sleepTag + ": " + done2);
        if (done1 != null && done2 != null) {
            return "done";
        } else {
            return null;
        }
    }
    return null;
}

setSleepTag = function () {
    var yesterday = new Date();
    var tomorrow = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (common.checkAuditTime("21:00", "24:00")) {
        var nowDate = new Date().Format("yyyy-MM-dd");
        var nextDate = tomorrow.Format("yyyy-MM-dd");
        common.safeSet(nowDate + ":night:" + sleepTag, "done");
        common.safeGet(nextDate + ":midnight:" + sleepTag, "done");
        log("已完成 " + nowDate + ":night:" + sleepTag + ", " + nextDate + ":midnight:" + sleepTag);
    } else if (common.checkAuditTime("00:00", "03:00")) {
        var nowDate = new Date().Format("yyyy-MM-dd");
        var lastDate = yesterday.Format("yyyy-MM-dd");
        common.safeGet(lastDate + ":night:" + sleepTag, "done");
        common.safeGet(nowDate + ":midnight:" + sleepTag, "done");
        log("已完成 " + lastDate + ":night:" + sleepTag + ", " + nowDate + ":midnight:" + sleepTag);
    }
}

sleepToEarn.doSleepMainBrowse = function () {
    log("doSleepMainBrowse");
    // 我的-> 元宝中心-> 去睡觉，先上划个半屏，看有没有浏览商品30秒，时有时无的，有的时候才做
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + browseTag);
    if (done != null) {
        log(browseTag + " 已做: " + done);
        return;
    }

    toast("doSleepMainBrowse");
    if (gotoSleepEarnCoins() == null) {
        commonAction.backToAppMainPage();
        return;
    }

    sleep(1000);
    log("往上划动半个屏幕: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
    var walkTips = textContains("浏览页面").findOne(1000);
    if (walkTips != null) {
        log("等待 商品 浏览完成，60s超时");
        var ret = commonAction.scrollThrough("浏览页面", 60);
        if (ret) {
            common.safeSet(nowDate + ":" + browseTag, "done");
            toastLog("完成 " + browseTag);
        } else {
            toastLog("60s timeout");
        }
    } else {
        toastLog("没有 浏览页面");
    }

    commonAction.backToAppMainPage();
}

sleepToEarn.doSleep = function () {
    log("doSleep");
    // 睡觉时间[21:00~03:00)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var sleepNightBeginTime = new Date(curDate + " 21:00:00").getTime();
    var sleepNightEndTime = new Date(curDate + " 24:00:00").getTime();
    var sleepMidnightBeginTime = new Date(curDate + " 00:00:00").getTime();
    var sleepMidnightEndTime = new Date(curDate + " 03:00:00").getTime();
    log("睡觉有效时间段: [" + 
        common.timestampToTime(sleepNightBeginTime) + ", " + 
        common.timestampToTime(sleepNightEndTime) + "], [" + 
        common.timestampToTime(sleepMidnightBeginTime) + ", " + 
        common.timestampToTime(sleepMidnightEndTime) + "]");
    //不在时间范围内不判断睡觉任务做没做
    if (!(now >= sleepNightBeginTime && now <= sleepNightEndTime || now >= sleepMidnightBeginTime && now <= sleepMidnightEndTime)) {
        return;
    }

    // 我的-> 元宝中心-> 去睡觉
    var done = getSleepTag();
    if (done != null) {
        return;
    }

    toast("doSleep");
    var sleepRecord = gotoSleepEarnCoins();
    if (sleepRecord == null) {
        commonAction.backToAppMainPage();
        return;
    }

    sleep(3000);
    var mainFrame = sleepRecord.parent().parent();
    var sleepBtn = mainFrame.child(1);
    log("睡觉按钮: " + sleepBtn.text());
    if (/\d+:\d+:\d+后可结束睡觉/.test(sleepBtn.text())) {
        setSleepTag();
        toastLog("完成 " + sleepTag);
        commonAction.backToAppMainPage();
        return;
    }

    var tips = "";
    for (var i = 0; i < 30; i++) {
        var objs = [];
        var sleepTips = mainFrame.child(3);
        common.queryList(sleepTips, 255, objs);
        for (var k = 0; k < objs.length; k++) {
            if (objs[k].className() == "android.view.View") {
                tips = tips + objs[k].text();
            }
        }
        tips = tips.replace(/\n/g, "");
        log("睡觉提示: " + tips);
        if (/可以睡觉赚元宝啦，今晚可赚取\d+元宝哦！/.test(tips)) {
            break;
        }
        sleep(1000);
        tips = "";
    }

    var coins = tips.match(/\d+/);
    if (sleepBtn.text() == "开始睡觉") {
        //21:00~02:45尽量等能666时才睡觉，02:45～03:00为最后时刻，不管收益去睡觉
        var urgentTime = common.checkAuditTime("02:45", "03:00");
        log("紧急时段: " + urgentTime);
        if (!urgentTime && coins != null && coins[0] == "666" || urgentTime) {
            var clickRet = sleepBtn.click();
            log("点击 开始睡觉: " + clickRet);
            if (clickRet) {
                setSleepTag();
                toastLog("完成 " + sleepTag);
            }
        }
    }

    commonAction.backToAppMainPage();
}

sleepToEarn.doWakeup = function () {
    log("doWakeup");
    // 我的-> 元宝中心-> 去睡觉
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + wakeupTag);
    if (done != null) {
        log(wakeupTag + " 已做: " + done);
        return;
    }

    // 唤醒时间[06:00~21:00)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var wakeupBeginTime = new Date(curDate + " 06:00:00").getTime();
    var wakeupEndTime = new Date(curDate + " 21:00:00").getTime();
    log("唤醒有效时间段: [" + common.timestampToTime(wakeupBeginTime) + ", " + common.timestampToTime(wakeupEndTime) + "]");
    //不在时间范围内不判断唤醒任务做没做
    if (now < wakeupBeginTime || now > wakeupEndTime) {
        return;
    }

    toast("doWakeup");
    var sleepRecord = gotoSleepEarnCoins();
    if (sleepRecord == null) {
        commonAction.backToAppMainPage();
        return;
    }

    sleep(1000);
    var mainFrame = sleepRecord.parent().parent();
    var wakeupBtn = mainFrame.child(1);
    var lucyPackageBtn = mainFrame.child(2).child(0);
    log("睡觉按钮: " + wakeupBtn.text())
    if (wakeupBtn.text() == "我醒来啦") {
        var clickRet = wakeupBtn.click();
        log("点击 我醒来啦: " + clickRet);
        if (clickRet) {
            common.safeSet(nowDate + ":" + wakeupTag, "done");
            toastLog("完成 " + wakeupTag);

            //关闭提示
            var doneTips = text("完成睡觉任务").findOne(1000);
            if (doneTips != null) {
                var doneDlg = doneTips.parent();
                var clickRet = doneDlg.child(doneDlg.childCount() - 1).click();
                log("关闭 完成睡觉任务: " + clickRet);
            }

            //点福袋
            log("福袋进度: " + lucyPackageBtn.text());
            if (lucyPackageBtn.text() == "2/3") {
                var clickRet = lucyPackageBtn.click();
                sleep(1000);
                var doneBtn = text("我知道啦").findOne(1000);
                if (doneBtn != null) {
                    clickRet = doneBtn.click();
                    log("关闭 领取福袋: " + clickRet);
                }
            }
        }
    } else {
        common.safeSet(nowDate + ":" + wakeupTag, "awake");
        toastLog("醒着呢 " + wakeupTag);
    }

    commonAction.backToAppMainPage();
}

module.exports = sleepToEarn;