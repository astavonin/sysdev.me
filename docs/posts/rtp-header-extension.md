---
title: "Identifying Video Streams Using RTP Header Extensions"
date: 2025-11-09
categories:
  - GStreamer
  - Video Streaming
  - C++
---

<figure style="float: left; width: 300px; margin: 0 1em 1em 0;" markdown>
  <a href="https://sysdev.me/img/Birch-Grove.jpeg" target="_blank">
    <img src="https://sysdev.me/img/Birch-Grove.jpeg" alt="caption" width="250">
  </a>
  <figcaption>
    Birch Grove near Bishkek. The grove is incredibly popular in the autumn.
  </figcaption>
</figure>

When a system manages dozens of cameras or edge devices, packets alone don’t tell you much. An IP and port might change, SSRCs can roll over, and NATs tend to shuffle everything just enough to break simple assumptions. Yet every media packet still needs a clear identity — not for transport, but for logic.  

There are many ways to attach that identity: control channels, per-session negotiation, external registries. But the most simple one is already part of RTP itself — the header extension defined by [RFC 8285](https://www.rfc-editor.org/rfc/rfc8285).

## How it works

RTP was designed to be extensible. After the fixed header and payload, packets can carry short metadata blocks called *header extensions*. Each extension has a small numeric ID and a URI describing its purpose.  

<!-- more -->

That makes it an ideal place for lightweight metadata such as a unique stream identifier. The ID repeats on every packet and travels through NATs, relays, and tunnels with zero signaling overhead. It’s simple, deterministic, and standardized.

Quite often you need t o create an additional plugin for GStreamr, but, furtunatly, not in this case. GStreamer already exposes the right API hooks through `gstrtpbuffer.h` and `gstrtphdrext.h`. One pad probe is enough to inject an identifier before the payload leaves the payloader.

```c
#include <gst/gst.h>
#include <gst/rtp/gstrtpbuffer.h>
#include <gst/rtp/gstrtphdrext.h>

static GstPadProbeReturn add_ext_probe(GstPad *pad, GstPadProbeInfo *info, gpointer user_data)
{
    GstBuffer *buf = GST_PAD_PROBE_INFO_BUFFER(info);
    if (!buf)
        return GST_PAD_PROBE_PASS;

    buf = gst_buffer_make_writable(buf);

    GstRTPBuffer rtp = GST_RTP_BUFFER_INIT;
    if (gst_rtp_buffer_map(buf, GST_MAP_WRITE, &rtp))
    {
        guint8 data[4] = {0x12, 0x34, 0x56, 0x78}; // Stream ID
        gst_rtp_buffer_add_extension_onebyte_header(&rtp, 1, data, sizeof(data));
        gst_rtp_buffer_unmap(&rtp);
    }

    GST_PAD_PROBE_INFO_DATA(info) = buf;
    return GST_PAD_PROBE_PASS;
}
```

The sender can advertise the mapping:
```
extmap-1=urn:example:stream-id
```

and the receiver can decode it using the same API. No external signaling, no synchronization delay. Each packet holds data to tell who it belongs to.

## Why it matters

Media servers often depend on connection state to classify incoming data. When a camera reconnects, the backend has to guess whether this new socket belongs to the same stream or not. That guess introduces delay, synchronization issues, and sometimes packet loss. With an identity embedded inside RTP itself, the backend doesn’t need to guess. The stream is self-describing. Relays and recorders can demultiplex by ID, loggers can tag frames consistently, and analytics services can correlate metadata without waiting for control messages.  

## Performance and compliance

The extension adds roughly five bytes per packet — one-byte header, one-byte ID, and the payload itself. For `H.264` or `H.265` streams, that’s less than 0.1 % bandwidth overhead.  

Because it’s part of RFC 8285, it’s backward-compatible: receivers that don’t recognize the extension simply skip it. No negotiation cost, no version mismatch.

## Verification

You can use any tool you like to capture traffick and check for RTP Header Extension in captured traffic. It will contain: 

```
RTP Header Extension
  One-Byte Header
  ID: 1
  Data: 12 34 56 78
```

!!! example "The complete example"
    You can find example [here](https://github.com/astavonin/streaming/tree/main/RTP-RFC-8285). It was tested using Ubuntu 24.04 and GStreamer ≥1.18.