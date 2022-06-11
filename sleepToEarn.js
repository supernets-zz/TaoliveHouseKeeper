var sleepToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const browseTag = "睡觉赚元宝浏览首页";
const sleepTag = "睡觉赚元宝去睡觉";    //每晚21:00至次日3:00
const wakeupTag = "睡觉赚元宝我醒来啦"; //次日06:00至20:59，同连续3天完成睡觉任务领取福袋

sleepToEarn.dailyJobs = [];
sleepToEarn.dailyJobs.push(browseTag);

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
        commonAction.backTaoliveMainPage();
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

    commonAction.backTaoliveMainPage();
}

sleepToEarn.doSleep = function () {
    log("doSleep");
    // 我的-> 元宝中心-> 去睡觉
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + sleepTag);
    if (done != null) {
        log(sleepTag + " 已做: " + done);
        return;
    }

    // 睡觉时间[21:00~03:00)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var sleepBeginTime = new Date(curDate + " 21:00:00").getTime();
    var sleepEndTime = new Date(curDate + " 02:59:59").getTime();
    log("唤醒有效时间段: [" + common.timestampToTime(sleepBeginTime) + ", " + common.timestampToTime(sleepEndTime) + "]");
    //不在时间范围内不判断唤醒任务做没做
    if (now < sleepBeginTime || now >= sleepEndTime) {
        return;
    }

    toast("doSleep");
    var sleepRecord = gotoSleepEarnCoins();
    if (sleepRecord == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

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

    commonAction.backTaoliveMainPage();
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

    // 唤醒时间[06:00~20:59)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var wakeupBeginTime = new Date(curDate + " 06:00:00").getTime();
    var wakeupEndTime = new Date(curDate + " 20:59:59").getTime();
    log("唤醒有效时间段: [" + common.timestampToTime(wakeupBeginTime) + ", " + common.timestampToTime(wakeupEndTime) + "]");
    //不在时间范围内不判断唤醒任务做没做
    if (now < wakeupBeginTime || now >= wakeupEndTime) {
        return;
    }

    toast("doWakeup");
    var sleepRecord = gotoSleepEarnCoins();
    if (sleepRecord == null) {
        commonAction.backTaoliveMainPage();
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

    commonAction.backTaoliveMainPage();
}

module.exports = sleepToEarn;