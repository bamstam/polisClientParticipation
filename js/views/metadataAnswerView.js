define([
  'templates/metadataAnswer',
  'view'
], function (
  template,
  View
) {

return View.extend({
  name: 'metadataAnswerView',
  template: template,
  allowDelete: false,
  
  deleteAnswer: function() {
    console.dir(arguments);
    console.dir(this);
  },
  initialize: function(options) {
      this.model = options.model;
      this.zid = options.zid;
  }
});

});
