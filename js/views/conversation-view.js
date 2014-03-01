var eb = require("../eventBus");
var View = require('../view');
var template = require('../tmpl/conversation-view');
var CommentView = require('../views/vote-view');
var CommentFormView = require("../views/comment-form")
var ChangeVotesView = require("../views/change-votes");
var MetadataQuestionsFilterView = require("../views/metadataQuestionsFilterView");
var ResultsView = require("../views/results-view");
var VoteModel = require("../models/vote");
var ParticipantModel = require("../models/participant");
var ConversationModel = require("../models/conversation");
var CommentModel = require("../models/comment");
var UserModel = require("../models/user");
var CommentsCollection = require("../collections/comments");
var VotesCollection = require("../collections/votes");
var MetadataQuestionsCollection = require("../collections/metadataQuestions");
var ResultsCollection = require("../collections/results");
var PolisStorage = require("../util/polisStorage");
var popoverEach = require("../util/popoverEach");
var Utils = require("../util/utils");
var VisView = require("../lib/VisView");
var TutorialController = require("../controllers/tutorialController");
var ServerClient = require("../lib/polis");

module.exports =  View.extend({
  name: "conversation-view",
  template: template,
  events: {
  },
  destroyPopovers: function() {
    popoverEach("destroy");
  },
  onClusterTapped : function() {
    this.destroyPopovers();
      // if (window.isMobile()) {
      //    window.scrollTo(0, $("#visualization_div").offset().top);
      // }
  },
  updateVotesByMeCollection: function() {
    console.log("votesByMe.fetch");
    if (this.pid < 0) {
      // DEMO_MODE
      return;
    }
    this.votesByMe.fetch({
      data: $.param({
        zid: this.zid,
        pid: this.pid
      }),
      reset: false
    });
  },
  initialize: function() {
    var that = this;
    var vis;
    var zid = this.zid = this.model.get("zid");
    var pid = this.pid;
    var zinvite = this.zinvite = this.model.get("zinvite");
    var is_public = this.model.get("is_public");

    this.tutorialController = new TutorialController();
    var metadataCollection = new MetadataQuestionsCollection([], {
        zid: zid
    });


    var resultsCollection = new ResultsCollection();

    window.m = metadataCollection;

    // HTTP PATCH - model.save({patch: true})

    function onClusterTapped() {
        that.onClusterTapped();
    }

    function initPcaVis() {
      var w = $("#visualization_div").width();
      var h = w/2;
      $("#visualization_div").height(h);
      if (vis) {
          serverClient.removePersonUpdateListener(vis.upsertNode);
      }
      vis = new VisView({
          getPid: function() {
            if (!_.isId(pid)) {
//              alert("bad pid: " + pid);
            }
            return pid;
          },
          getCommentsForProjection: serverClient.getCommentsForProjection,
          getCommentsForGroup: serverClient.getCommentsForGroup,
          getReactionsToComment: serverClient.getReactionsToComment,
          getUserInfoByPid: serverClient.getUserInfoByPidSync,
          getTotalVotesByPidSync: serverClient.getTotalVotesByPidSync,
          w: w,
          h: h,
          computeXySpans: Utils.computeXySpans,
          el_queryResultSelector: ".query_results_div",
          el: "#visualization_div"
      });
      serverClient.addPersonUpdateListener(function() {
        vis.upsertNode.apply(vis, arguments);
      });

      that.tutorialController.setHandler("blueDot", function(){
        that.$blueDotPopover = that.$("#visualization_div").popover({
          title: "DOTS ARE PEOPLE",
          content: "Each dot represent one or more people. The blue circle represents you. By reacting to a comment, you have caused your dot to move. As you and other participants react, you will move closer to people who reacted similarly to you, and further from people who reacted differently. <button type='button' id='blueDotPopoverButton' class='btn btn-lg btn-primary' style='display: block; margin-top:20px'> Ok, got it </button>",
          html: true,
          trigger: "manual",
          placement: "bottom"
        }).popover("show");
        $('#blueDotPopoverButton').click(function(){
          that.$blueDotPopover.popover("destroy");
        });
      });
      that.tutorialController.setHandler("shadedGroup", function(){
        that.$shadedGroupPopover = that.$("#visualization_div").popover({
          title: "CLICK ON GROUPS",
          content: "Shaded areas represent groups. Click on a shaded area to show comments that most represent this group's opinion, and separate this group from the other groups.<button type='button' id='shadedGroupPopoverButton' class='btn btn-lg btn-primary' style='display: block; margin-top:20px'> Ok, got it </button>",
          html: true, 
          trigger: "manual",
          placement: "bottom"
        }).popover("show");
        $('#shadedGroupPopoverButton').click(function(){
          that.$shadedGroupPopover.popover("destroy");
        });
      });
      that.tutorialController.setHandler("analyzePopover", function(){
        setTimeout(function(){
          that.$analyzeViewPopover = that.$('.query_results > li').first().popover({
            title: "COMMENTS FOR THIS GROUP",
            content: "Clicking on a shaded area brings up the comments that brought this group together: comments that were agreed upon, and comments taht were disagreed upon. Click on a comment to see which participants agreed (green/up) and which participants disagreed (red/down) across the whole conversation. Participants who haven't reacted to the selected comment disappear. <button type='button' id='analyzeViewPopoverButton' class='btn btn-lg btn-primary' style='display: block; margin-top:20px'> Ok, got it </button>",
            html: true,
            trigger: "manual",
            placement: "bottom"  
          });
          that.$('.query_results > li').first().trigger('click');
          that.$analyzeViewPopover.popover("show");
          that.$('#analyzeViewPopoverButton').click(function(){
            that.$analyzeViewPopover.popover("destroy");
          })      
        },1500)
      }) 
    }  

    // just a quick hack for now.
    // we may need to look into something more general
    // http://stackoverflow.com/questions/11216392/how-to-handle-scroll-position-on-hashchange-in-backbone-js-application
    var scrollTopOnFirstShow = _.once(function() {
      // scroll to top
      window.scroll(0,0);
    });


    this.votesByMe = new VotesCollection();

    var serverClient = that.serverClient = new ServerClient({
      zid: zid,
      zinvite: zinvite,
      tokenStore: PolisStorage.token,
      pid: pid,
      votesByMe: this.votesByMe,
      //commentsStore: PolisStorage.comments,
      //reactionsByMeStore: PolisStorage.reactionsByMe,
      utils: window.utils,
      protocol: /localhost/.test(document.domain) ? "http" : "https",
      domain: /localhost/.test(document.domain) ? "localhost:5000" : "www.polis.io",
      basePath: "",
      logger: console
    });


      this.serverClient.addPollingScheduledCallback(function() {
        that.updateVotesByMeCollection();
      });
      this.serverClient.startPolling();
      /* child views */

      this.metadataQuestionsView = new MetadataQuestionsFilterView({
        serverClient: serverClient,
        zid: zid,
        collection: metadataCollection
      });

      this.listenTo(this.metadataQuestionsView, "answersSelected", function(enabledAnswers) {
        console.log(enabledAnswers);
        serverClient.queryParticipantsByMetadata(enabledAnswers).then(
          vis.emphasizeParticipants,
          function(err) {
            alert(err);
          });
      });



      this.changeVotes = new ChangeVotesView({
        serverClient: serverClient,
        zid: zid
      });

      this.commentView = new CommentView({
        serverClient: serverClient,
        votesByMe: this.votesByMe,
        is_public: is_public,
        pid: pid,
        zid: zid
      });
      // this.commentView.on("vote", this.tutorialController.onVote);

      this.commentsByMe = new CommentsCollection({
        zid: zid,
        pid: pid
      });

      this.commentForm = new CommentFormView({
        pid: pid,
        collection: this.commentsByMe,
        zid: zid
      });

      this.resultsView = new ResultsView({
        serverClient: serverClient,
        zid: zid,
        collection: resultsCollection
      });

      // this.votesByMe.on("all", function(x) {
      //   console.log("votesByMe.all", x);
      // });
      // this.votesByMe.on("change", function() {
      //   console.log("votesByMe.change");
      //   serverClient.updateMyProjection(that.votesByMe);
      // });
      var updateMyProjectionAfterAddingVote = _.throttle(function() {
        console.log("votesByMe.add");
        serverClient.updateMyProjection(that.votesByMe);
      }, 200);
      this.votesByMe.on("add", updateMyProjectionAfterAddingVote);

      this.commentForm.on("commentSubmitted", function() {
        // $("#commentViewTab").tab("show");
      });

      /* tooltips */
      console.log("here are the views children:");
      console.dir(this.children);

      metadataCollection.fetch({
          data: $.param({
              zid: zid
          }),
          processData: true
      });
      this.commentForm.updateCollection();

    // Clicking on the background dismisses the popovers.
    this.$el.on("click", function() {
      that.destroyPopovers();
    });

    eb.on("clusterClicked", onClusterTapped);

    this.listenTo(this, "rendered", function(){
      setTimeout(function() {

      scrollTopOnFirstShow();

      $("#visualization_div").affix({
        offset: {
          top: 150 //will be set dynamically
        }
      });
      function deselectHulls() {
        vis.deselect();
      }

      that.commentView.on("showComment", _.once(function() {
        that.$("#commentViewTab").tooltip({
          title: "Start here - read and react to comments submitted by others.",
          placement: "top",
          delay: { show: 300, hide: 200 },
          container: "body"

        })
        .on("click", deselectHulls);
      }));

      that.$("#commentFormTab").tooltip({
        title: "If your ideas aren't already represented, submit your own comments. Other participants will be able to react.",
        placement: "top",
        delay: { show: 300, hide: 200 },
        container: "body"
      })
      .on("click", deselectHulls);

      that.$("#analyzeTab").tooltip({
        title: "Filters! Click on the \"analyze\" tab to sort participants using metadata. For instance, maybe you only want to see female respondants under 40, or only managers in the NYC office, etc.",
        placement: "top",
        delay: { show: 300, hide: 200 },
        container: "body"

      // Wait until the first comment is shown before showing the tooltip
      });
      that.commentView.on("showComment", _.once(function() {      
        that.$commentViewPopover = that.$("#commentView").popover({
          title: "START HERE",
          content: "Read comments submitted by other participants and react using these buttons. <button type='button' id='commentViewPopoverButton' class='btn btn-lg btn-primary' style='display: block; margin-top:20px'> Ok, got it </button>",
          html: true, //XSS risk, not important for now
          trigger: "manual",
          placement: "bottom"
        });
      }));
      
      setTimeout(function(){
        that.$commentViewPopover.popover("show");
        $("#commentViewPopoverButton").click(function(){
          that.$commentViewPopover.popover("destroy");
        });
      },1000);

      initPcaVis();
      
      $(window).resize(_.throttle(initPcaVis, 100));

  }, 0); // end listenTo "rendered"
  });

  } // end initialize
});