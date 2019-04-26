const objectHash = require('object-hash');
const chance = require('chance');
const allowedMethods = ["bool","character","floating","integer","letter","natural","prime","string","paragraph","sentence","syllable","word","age","birthday","cf","cpf","first","gender","last","name","prefix","ssn","suffix","animal","android_id","apple_token","bb_pin","wp7_anid","wp8_anid2","avatar","color","company","domain","email","fbid","google_analytics","hashtag","ip","ipv6","klout","profession","tld","twitter","url","address","altitude","areacode","city","coordinates","country","depth","geohash","latitude","longitude","phone","postal","postcode","province","state","street","zip","ampm","date","hammertime","hour","millisecond","minute","month","second","timestamp","timezone","weekday","year","cc","cc_type","currency","currency_pair","dollar","euro","exp","exp_month","exp_year","capitalize","mixin","pad","pick","pickone","pickset","set","shuffle","coin","dice","guid","hash","hidden","n","normal","radio","rpg","tv","unique","weighted"];


/**
 * Takes a tag string (in the format {{random:methodName:arg1,val1:arg2,val2}}) and returns random value appropriately
 * @param {*} tag tag string
 * @param {*} myChance instance of Chance 
 */
function getRandomStringFromTag(tag,myChance){

    //Split tag into method + argument blocks
    var split = tag.split(":");

    //Method name is first bit
    var methodName = split[1];
    if(methodName.slice(-2) == "}}")
        methodName = methodName.slice(0,-2);
    var args = {};
    var hasArgs = false;

    //If the method they're calling is one of the allowed ones...
    if(allowedMethods.includes(methodName)){
        //Go through each arg block, and if properly formatted, save an arg
        for(let i = 2; i < split.length; i++){
            var subSplit = split[i].split(/,|}}/);
            if(subSplit.length >= 2){
                hasArgs = true;
                args[subSplit[0]] = subSplit[1];
            }
        }
        //Pass given method name the args we collected, return result
        try{
            if(hasArgs)
                return myChance[methodName](args);
            else
                return myChance[methodName]();
        }catch(e){
            return "Error in Random Syntax";
        }
    }else{
        return "";
    }
}

/**
 * Takes in a body string + set of req params. Uses req params to generate a seed hash, and replaces template tags with random responses based on that seed.
 * @param {string} resBody The response body 
 * @param {*} reqBody Request body (in any form)
 * @param {*} query Query array from req
 * @param {*} path Path from req
 */
function performRandomInsertion(resBody,reqBody,query,path){

    //Instantiate chance with hash based on given req values
    var myChance = new chance(objectHash(reqBody)+objectHash(query)+objectHash(path));

    //Find our tags
    var split = resBody.split(/({{random:[A-z:,0-9]+}})/);
    var retBody = "";

    //Go through each split part of body, parse tags, and reassemble
    split.forEach(function(str){
        if(str.startsWith("{{random:")){
           retBody += getRandomStringFromTag(str,myChance);
        }else{
            retBody += str;
        }
    });

    return retBody;
}

module.exports = {
    performRandomInsertion:performRandomInsertion
}