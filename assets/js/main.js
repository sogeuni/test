!function ($) {

  $(function () {
    var $window = $(window)
    var $body   = $(document.body)

    orderTheLeftNavigations();

    function orderTheLeftNavigations(){
      $('#navigation .sidenav').html($("#markdown-toc").html());
      $('#navigation .sidenav ul').addClass("nav");
      $("#markdown-toc").remove();
    }

    $body.scrollspy({
      target: '.sidebar',
      offset: 20
    });

    function resetHeaderItemStyles(headers){
      if(headers != undefined && headers.length > 0){
        for(var i=0; i< headers.length;i++){
          
          var header = headers[i];
          console.log($(header).html());
           $(header).html('<span class="anchor-target" id="' + header.id + '"></span>' +
             '<a href="#' + header.id + '" name="' + header.id + '" class="anchor glyphicon glyphicon-link"></a>' + 
             $(header).html());
          $(header).removeAttr('id');
        }
      }
    }

    $window.load(function() {
      resetHeaderItemStyles($(".content h2"));
      resetHeaderItemStyles($(".content h3"));
    });

    $window.on('load', function () {
      
    });
  })
}(jQuery)