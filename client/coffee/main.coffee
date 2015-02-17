$(document).ready ->
  $credits = $('.credits')
  $creditsPosition = $credits.offset()
  $('.video-ads').remove()
  loadCSS('/css/main.css')
# jQuery to collapse the navbar on scroll
  $(window).scroll ->
    if $('.navbar').offset().top > 50
      $('.navbar-fixed-top').addClass 'top-nav-collapse'
    else
      $('.navbar-fixed-top').removeClass 'top-nav-collapse'
    return

  $('a.page-scroll').bind 'click', (event) ->
    $anchor = $(this)
    $('html, body').stop().animate {
      scrollTop: $($anchor.attr('href')).offset().top - 70 },
      1000, 'easeInOutExpo'
    event.preventDefault()
    return

  $('.chevron').on 'click', ->
    $('body').animate { scrollTop: $('#about').offset().top - 70 }, 1000
    return

  $('.navbar-collapse ul li a').click ->
    $('.navbar-toggle:visible').click()
    return

  myPlayer = $('#bgndVideo').YTPlayer()

  mapElement = new (window.GMaps)(
    el: $('#map')[0]
    lat: 45.94
    lng: 25.00
    width: '100%'
    height: '25em'
    zoom: 6
  )
