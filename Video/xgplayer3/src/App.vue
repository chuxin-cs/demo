<template>
  <div>
    <div id="mse"></div>
  </div>
</template>

<script setup lang="ts">
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv'
import 'xgplayer/dist/index.min.css';

let player = new Player({
  id: 'mse',
  url: 'http://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv',
  height: '100%',
  width: '100%',
  plugins: [FlvPlugin],
});

</script>
