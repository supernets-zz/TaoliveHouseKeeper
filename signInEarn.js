var signInEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const signInTag = "元宝中心每日签到";   //null-状态未知, done-已完成, out of time-过期
const getSignInBonusTag = "元宝中心每日签到开奖";

signInEarn.dailyJobs = [];
signInEarn.dailyJobs.push(signInTag);

signInEarn.doSignIn = function () {
    log("doSignIn");
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + signInTag);
    if (done != null) {
        log(signInTag + " 已做: " + done);
        if (done == "done") {
            common.grantWalkToEarnPermission();
        }
        return;
    }

    //正常收益下签到才会成功，否则就是一直没签到
    toast("doSignIn");
    // 我的-> 元宝中心-> 去签到，上划屏幕找到去签到或待开奖按钮
    if (!commonAction.gotoCoinCenter()) {
        commonAction.backTaoliveMainPage();
        return;
    }

    var btnSignIn = null;
    for (var i = 0; i < 10; i++) {
        btnSignIn = textMatches(/去签到|待开奖|去开奖/).visibleToUser(true).findOne(1000);
        if (btnSignIn == null || btnSignIn != null && btnSignIn.bounds().height() < 42) {
            log("上划屏幕找 去签到|待开奖|去开奖: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
            sleep(1000);
            continue;
        }
        break;
    }

    if (btnSignIn == null) {
        log("去签到|待开奖|去开奖 not found")
        commonAction.backTaoliveMainPage();
        return;
    }

    //去签到按钮变为待开奖说明已经签过到了
    if (btnSignIn.text() == "待开奖") {
        //点击立即签到有可能因非正常收益导致签到失败，故放在这判定签到是否成功
        common.safeSet(nowDate + ":" + signInTag, "done");
        toastLog("完成 " + signInTag);
        common.grantWalkToEarnPermission();
        commonAction.backTaoliveMainPage();
        return;
    }

    // 签到时间[00:00~20:00)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var signInBeginTime = new Date(curDate + " 00:00:00").getTime();
    var signInEndTime = new Date(curDate + " 20:00:00").getTime();
    log("签到有效时间段: [" + common.timestampToTime(signInBeginTime) + ", " + common.timestampToTime(signInEndTime) + "]");
    //不在时间范围内，签到任务又没做，当日就断签了
    if (now < signInBeginTime || now > signInEndTime) {
        common.safeSet(nowDate + ":" + signInTag, "out of time");
        toastLog("过期 " + signInTag);
        commonAction.backTaoliveMainPage();
        return;
    }

    log("点击 去签到: " + click(btnSignIn.bounds().centerX(), btnSignIn.bounds().centerY()));
    sleep(5000);

    //在正常收益阶段未签到的情况下进到这里app就会自动签到
    //提示语"签到提醒"
    var signInReminder = common.waitForText("text", "签到提醒", true, 10);
    var signInFrame = signInReminder.parent();
    var signInCalendar = signInFrame.child(signInFrame.childCount() - 1);   //最后一个子节点
    //有14个子节点，遍历一遍，子节点可点击，要找其最后一个子节点为view且日期与当日相同的点击，最后一个有点特殊(depth(18)可点击)，比前面的13个(depth(17)可点击)多一层
    for (var i = 0; i < signInCalendar.childCount(); i++) {
        var signInItem = signInCalendar.child(i);   //可点击
        //连续14天签到的前13天签到
        if (i != signInCalendar.childCount() - 1) {
            if (signInItem.child(signInItem.childCount() - 1).className() == "android.view.View") {
                log(signInItem.child(signInItem.childCount() - 1).text());
                if (signInItem.child(signInItem.childCount() - 1).text() == "立即签到") {
                    log("点击 立即签到: " + signInItem.click());
                    sleep(1000);
                    break;
                }
            } else {
                log("已签");
            }
        } else {    //连续14天签到的最后一天签到
            var lastSignInItem = signInItem.child(0);   //可点击
            if (lastSignInItem.child(lastSignInItem.childCount() - 1).className() == "android.view.View") {
                log(lastSignInItem.child(lastSignInItem.childCount() - 1).text());
                if (lastSignInItem.child(lastSignInItem.childCount() - 1).text() == "立即签到") {
                    log("点击 立即签到: " + lastSignInItem.click());
                    sleep(1000);
                    break;
                }
            } else {
                log("已签");
            }
        }
    }

    commonAction.backTaoliveMainPage();
}

signInEarn.doGetSignInBonus = function () {
    log("doGetSignInBonus");
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + getSignInBonusTag);
    if (done != null) {
        log(getSignInBonusTag + " 已做: " + done);
        return;
    }

    //看签到了没，没签到也开不了奖
    var signed = common.safeGet(nowDate + ":" + signInTag);
    if (signed != "done") {
        log(signInTag + " 状态: " + signed);
        return;
    }

    // 开奖时间[20:00~24:00)
    var now = new Date().getTime();
    var curDate = new Date().Format("yyyy/MM/dd");
    var getBonusBeginTime = new Date(curDate + " 20:00:00").getTime();
    var getBonusEndTime = new Date(curDate + " 24:00:00").getTime();
    log("签到开奖有效时间段: [" + common.timestampToTime(getBonusBeginTime) + ", " + common.timestampToTime(getBonusEndTime) + "]");
    if (now < getBonusBeginTime || now > getBonusEndTime) {
        log("未到开奖时间");
        return;
    }

    //正常收益下开奖才能获取收益
    toast("doGetSignInBonus");
    // 我的-> 元宝中心-> 待开奖，上划屏幕找到去签到或待开奖按钮
    if (!commonAction.gotoCoinCenter()) {
        commonAction.backTaoliveMainPage();
        return;
    }

    var btnSignIn = null;
    for (var i = 0; i < 10; i++) {
        btnSignIn = textMatches(/去签到|待开奖|去开奖/).visibleToUser(true).findOne(1000);
        if (btnSignIn == null || btnSignIn != null && btnSignIn.bounds().height() < 42) {
            log("上划屏幕找 去签到|待开奖|去开奖: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
            sleep(1000);
            continue;
        }
        break;
    }

    if (btnSignIn == null) {
        log("去签到|待开奖|去开奖 not found")
        commonAction.backTaoliveMainPage();
        return;
    }

    log("点击 去开奖: " + click(btnSignIn.bounds().centerX(), btnSignIn.bounds().centerY()));

    //每日签到开奖
    var getBonusTips = common.waitForText("text", "最高可获得1000000元宝", true, 10);
    var bonusFrame = getBonusTips.parent();
    log(bonusFrame.child(bonusFrame.childCount() - 1).click());
    sleep(1000);

    commonAction.backTaoliveMainPage();
}

module.exports = signInEarn;