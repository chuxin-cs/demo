<template>
  <div style="width: 200px;height: 200px;background-color: #000;">
    <div id="app1"></div>
  </div>
</template>

<script lang="ts" setup>

  setTimeout(()=>{
   console.log(window.Jessibuca)
  const player =  new window.Jessibuca({
          container: document.getElementById("app1"),
          isFlv: true,
          videoBuffer: 0.2, // 缓冲时长
          isResize: false, // 是否自动调整大小
          hasAudio: true, // 是否有音频
          loadingText: '加载中...',
          showBandwidth: false,
          loadingTimeout: 10,
          heartTimeout: 10,
          heartTimeoutReplay: false,
          loadingTimeoutReplay: false,
          supportDblclickFullscreen: true,
          operateBtns: {
            fullscreen: true, // 全屏按钮
            screenshot: true, // 截图按钮
            play: true, // 播放/暂停按钮
            audio: true, // 音频按钮
          },
        });

      // ../public/output_aac.flv
        player.play('http://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv').catch((err) => {
    console.log(err);
  })
  },3000)

</script>