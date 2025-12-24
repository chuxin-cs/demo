<template>
  <div class="app-container">
    <div id="mse"></div>
    <APlayer />
  </div>
</template>

<script setup lang="ts">
import APlayer from "./a.vue"
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv'
import 'xgplayer/dist/index.min.css';

setTimeout(() => {
  let player = new Player({
    id: 'mse',
    // url: 'http://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv',
    url: '../public/output_aac.flv',
    height: '200px',
    width: '200px',
    plugins: [FlvPlugin],
  });


}, 3000);
</script>


<style>
html,
#app,
body {
  height: 100vh;
  height: 100vw;
}

.app-container {
  width: 100%;
  height: 100%;
}
</style>