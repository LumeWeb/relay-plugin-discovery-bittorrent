import type { Plugin, PluginAPI } from "@lumeweb/relay-types";
import DHT from "bittorrent-dht";
import eddsa from "bittorrent-dht-sodium";
import type { Peer } from "@lumeweb/peer-discovery";
import b4a from "b4a";
import sha from "sha.js";

async function get(dht: DHT, api: PluginAPI) {
  return new Promise((resolve, reject) => {
    dht.get(getHash(api.identity.publicKeyRaw), (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(res);
    });
  });
}

async function put(dht: DHT, api: PluginAPI) {
  let existing;
  let seq = 1;

  try {
    existing = await get(dht, api);
    seq = existing.seq;
  } catch (e) {
    api.logger.debug(e);
  }

  let data = getData(api);

  if (existing) {
    let existingData = JSON.parse(existing.v.toString());
    if (data.host !== existingData.host || data.port !== existingData.port) {
      seq++;
    }
  }

  dht.put(
    {
      k: api.identity.publicKeyRaw,
      seq,
      v: getDataEncoded(api),
      sign: function (buf) {
        let key = b4a.alloc(64);
        b4a.copy(api.identity.privateKey, key);
        b4a.copy(api.identity.publicKeyRaw, key, 32);
        return eddsa.sign(buf, key);
      },
    },
    function (err) {
      if (err) {
        api.logger.error(err);
      }
    }
  );
}
function getData(api: PluginAPI): Peer {
  return {
    host: api.config.str("domain"),
    port: api.config.uint("port"),
  };
}
function getDataEncoded(api: PluginAPI): Buffer {
  return b4a.from(JSON.stringify(getData(api))) as Buffer;
}

function getHash(pubkey): string {
  return sha("sha1").update(pubkey).digest();
}

const plugin: Plugin = {
  name: "discovery-bittorrent",
  async plugin(api: PluginAPI): Promise<void> {
    const dht = new DHT({ verify: eddsa.verify });
    await put(dht, api);

    setTimeout(() => put(dht, api), 1000 * 60 * 60);
  },
};

export default plugin;
