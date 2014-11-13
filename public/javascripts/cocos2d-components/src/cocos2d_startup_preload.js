cc.game.onStart = function(){
    cc.view.adjustViewPort(true);

    //load resources
    cc.LoaderScene.preload(g_resources, function () {
        cc.director.runScene(new GameScene());
    }, this);
};

cc.game.run();

var GameScene = cc.Scene.extend({
    onEnter:function () {
        this._super();

        var sandLayer = new SandLayer();
        this.addChild(sandLayer);
        setupDrawRegions(sandLayer);

        this.addChild(new PlayerMovementLayer());
    }
});