cc.game.onStart = function(){
    cc.view.adjustViewPort(true);

    //load resources
    cc.LoaderScene.preload(g_resources, function () {
        cc.director.runScene(new GameScene());
    }, this);
};

cc.game.run();