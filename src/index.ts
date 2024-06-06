import { getInfo, getURLType } from "tidal-music-api";
import type {
  Album as TidalAlbum,
  Mix as TidalMix,
  Playlist as TidalPlaylist,
  Track as TidalTrack,
  Video as TidalVideo,
} from "tidal-music-api";
import { DisTubeError, InfoExtractorPlugin, Playlist, Song } from "distube";
import type { ResolveOptions } from "distube";

const BASE_URL = "https://tidal.com/browse";
const SUPPORTED_TYPES = ["ALBUM", "PLAYLIST", "MIX", "TRACK", "VIDEO"];

export class TidalPlugin extends InfoExtractorPlugin {
  validate(url: string) {
    if (typeof url !== "string" || !url.includes("tidal.com")) return false;
    const type = getURLType(url);
    if (!type || !SUPPORTED_TYPES.includes(type)) return false;
    return true;
  }

  async resolve<T>(url: string, { member, metadata }: ResolveOptions<T>): Promise<Song<T> | Playlist<T>> {
    const type = getURLType(url);
    if (!type) throw new DisTubeError("TIDAL_PLUGIN_INVALID_URL", `Invalid Tidal url: ${url}`);

    const data = await getInfo(url).catch(e => {
      throw new DisTubeError("TIDAL_PLUGIN_API_ERROR", e.message);
    });
    if (!data.type || !SUPPORTED_TYPES.includes(data.type)) {
      throw new DisTubeError("TIDAL_PLUGIN_NOT_SUPPORTED", "This tidal link is not supported.");
    }

    if (data.type === "TRACK" || data.type === "VIDEO") {
      return new Song(
        {
          plugin: this,
          source: "tidal",
          playFromSource: false,
          id: data.id.toString(),
          url: `${BASE_URL}/${data.type.toLowerCase()}/${data.id}`,
          name: (data as TidalTrack | TidalVideo).title,
          uploader: {
            name: (data as TidalTrack | TidalVideo).artists.map(a => a.name).join(", "),
          },
          thumbnail:
            (data as TidalTrack | TidalVideo).image.large ||
            (data as TidalTrack | TidalVideo).image.medium ||
            (data as TidalTrack | TidalVideo).image.small ||
            (data as TidalTrack | TidalVideo).image.xsmall,
        },
        { member, metadata },
      );
    }
    return new Playlist(
      {
        source: "tidal",
        url: `${BASE_URL}/${data.type.toLowerCase()}/${data.id}`,
        name: (data as TidalAlbum | TidalMix | TidalPlaylist).title,
        id: data.id.toString(),
        thumbnail:
          (data as TidalAlbum | TidalMix | TidalPlaylist).image.large ||
          (data as TidalAlbum | TidalMix | TidalPlaylist).image.medium ||
          (data as TidalAlbum | TidalMix | TidalPlaylist).image.small ||
          (data as TidalAlbum | TidalMix | TidalPlaylist).image.xsmall,
        songs: (data as TidalAlbum | TidalMix | TidalPlaylist).tracks.map(
          (song: TidalTrack) =>
            new Song(
              {
                plugin: this,
                source: "tidal",
                playFromSource: false,
                id: song.id.toString(),
                url: `${BASE_URL}/track/${data.id}`,
                name: song.title,
                uploader: {
                  name: song.artists.map(a => a.name).join(", "),
                },
                thumbnail: song.image.large || song.image.medium || song.image.small || song.image.xsmall,
              },
              { member, metadata },
            ),
        ),
      },
      { member, metadata },
    );
  }

  createSearchQuery<T>(song: Song<T>) {
    return `${song.name} ${song.uploader.name}`;
  }

  getRelatedSongs() {
    return [];
  }
}

export default TidalPlugin;
