const MQService = require('../models/mq/MQService');
const Service = require('../models/http/Service');
//const Recording = require('../models/http/Recording');
const User = require('../models/common/User');
const System = require('../models/common/System');
const DraftService = require ('../models/common/DraftService');
const Archive = require ('../models/common/Archive');


function getAllServicesByGroups(){
    return new Promise(
        function(resolve, reject){
            Service.aggregate(
                {
                    $group:{
                        _id:"$sut.name",
                        totalServices:
                        {
                            $sum:1
                        },
                        totalTransactions: {$sum:"$txnCount"}
                    }
                },{
                    $project:
                    {
                        sut:"$_id",
                        services:"$totalServices",
                        transactions:"$totalTransactions",
                        _id:false
                    } 
                }
                     
            ).then(function(result){
                resolve(result);
            }).catch(function(err){
                reject(err);
            });
        }
    );
}

function getTotalTransactionCount(){

        return new Promise(
            function(resolve, reject){
                Service.aggregate(
                    {
                        $group:{_id:null,totalTransactions: {$sum:"$txnCount"}}
                    }
                ).then(function(result){
                    resolve(result[0].totalTransactions);
                })
                .catch(function(err){
                    reject(err);
                });



            }
        );
        
        
        

}


/**
 * Returns a promise that returns the # of total Services+MQServices. Does not include archive/drafts
 * @return A promise that returns the # of total Services+MQServices
 */
function getCountOfAllServices(){
    return new Promise(function(resolve,reject){
        Service.count({},function(err,serviceCount){
            if(err)
                reject(err);
            else{
                MQService.count({},function(err,mqServiceCount){
                    if(err)
                        reject(err);
                    else{
                        resolve(mqServiceCount+serviceCount);
                    }
                });
            }
        });
    });
}

/**
 * Returns a promise that returns the # of active Services+MQServices. Does not include archive/drafts
 * @return A promise that returns the # of active Services+MQServices
 */
function getCountOfActiveServices(){
    return new Promise(function(resolve,reject){
        Service.count({running:true},function(err,serviceCount){
            if(err)
                reject(err);
            else{
                MQService.count({running:true},function(err,mqServiceCount){
                    if(err)
                        reject(err);
                    else{
                        resolve(mqServiceCount+serviceCount);
                    }
                });
            }
        });
    });
}


/**
 * Returns a promise that evaluates to the # of draft services
 */
function getCountOfDraftServices(){
    return new Promise(function(resolve,reject){
        DraftService.count({},
            function(err,count){
                if(err)
                    reject(err);
                else
                    resolve(count);

                
            }
        );
    });
}

/**
 * Returns a promise that evaluates to the # of archive services
 */
function getCountOfArchiveServices(){
    return new Promise(function(resolve,reject){
        Archive.count({},
            function(err,count){
                if(err)
                    reject(err);
                else
                    resolve(count);

                
            }
        );
    });
}

/**
 * Returns a promise that evaluates to the # of users
 */
function getCountOfUsers(){
    return new Promise(function(resolve,reject){
        User.count({},
            function(err,count){
                if(err)
                    reject(err);
                else
                    resolve(count);

                
            }
        );
    });
}

/**
 * Returns a promise that evaluates to the # of Systems
 */
function getCountOfSystems(){
    return new Promise(function(resolve,reject){
        System.count({},
            function(err,count){
                if(err)
                    reject(err);
                else
                    resolve(count);

                
            }
        );
    });
}

/**
 * Runs + returns a full report 
 * @param {*} req express req
 * @param {*} rsp express rsp
 * @param {*} next next middleware
 */
function fullReport(req,rsp,next){
    var report = {};
    var promises = [];
    var promiseLabels = [];

    //Build list of promises
    promises.push(getCountOfAllServices());
    promiseLabels.push("totalServices");

    promises.push(getCountOfActiveServices());
    promiseLabels.push("activeServices");

    promises.push(getCountOfDraftServices());
    promiseLabels.push("draftServices");

    promises.push(getCountOfArchiveServices());
    promiseLabels.push("archiveServices");

    promises.push(getCountOfUsers());
    promiseLabels.push("users");

    promises.push(getCountOfSystems());
    promiseLabels.push("systems");

    promises.push(getTotalTransactionCount());
    promiseLabels.push("totalTransactions");

    promises.push(getAllServicesByGroups());
    promiseLabels.push("servicesByGroup");

    Promise.all(promises).then(
        function(vals){
            for(let i = 0; i < vals.length; i++){
                report[promiseLabels[i]] = vals[i];
            }
            rsp.json(report);
        }
        ,
        function(err){
            handleError(err,rsp,500);
        }
    );

}

module.exports = {
    fullReport : fullReport
}