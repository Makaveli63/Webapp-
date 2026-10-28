package io.github.makaveli63.gamingbase;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * « Écouter les actus » : lit les résumés à voix haute avec la voix du téléphone, l'un après l'autre
 * (la lecture continue écran éteint). L'avancement est renvoyé au site (événement « gb-speak »).
 */
final class NewsReader {
    interface Listener {
        void onState(int index, String state);
    }

    private final Listener listener;
    private final List<String> texts = new ArrayList<>();
    private TextToSpeech tts;
    private boolean ready;
    private int index = -1;
    private boolean paused;

    NewsReader(MainActivity activity, Listener listener) {
        this.listener = listener;
        tts = new TextToSpeech(activity.getApplicationContext(), status -> {
            ready = status == TextToSpeech.SUCCESS;
            if (!ready) {
                listener.onState(-1, "error");
                return;
            }
            tts.setLanguage(Locale.FRANCE);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String id) {
                    listener.onState(index, "playing");
                }

                @Override
                public void onDone(String id) {
                    if (!paused && String.valueOf(index).equals(id)) play(index + 1);
                }

                @Override
                @SuppressWarnings("deprecation")
                public void onError(String id) {
                    listener.onState(index, "error");
                }
            });
            if (index >= 0) play(index);
        });
    }

    void start(String json) {
        texts.clear();
        try {
            JSONArray items = new JSONArray(json);
            for (int i = 0; i < items.length() && i < 20; i++) {
                JSONObject it = items.optJSONObject(i);
                String text = it != null ? it.optString("text") : "";
                if (!text.isEmpty()) texts.add(text.length() > 3000 ? text.substring(0, 3000) : text);
            }
        } catch (Exception ignored) {
            // liste illisible : rien à lire
        }
        paused = false;
        if (ready) play(0);
        else index = 0;
    }

    void control(String cmd) {
        switch (cmd) {
            case "pause":
                paused = true;
                tts.stop();
                listener.onState(index, "paused");
                break;
            case "resume":
                paused = false;
                play(Math.max(0, index));
                break;
            case "next":
                paused = false;
                play(index + 1);
                break;
            case "previous":
                paused = false;
                play(Math.max(0, index - 1));
                break;
            default:
                stop();
        }
    }

    private void play(int i) {
        if (!ready) return;
        if (i >= texts.size()) {
            stop();
            return;
        }
        index = i;
        tts.speak(texts.get(i), TextToSpeech.QUEUE_FLUSH, new Bundle(), String.valueOf(i));
    }

    void stop() {
        paused = false;
        if (tts != null) tts.stop();
        index = -1;
        listener.onState(-1, "stopped");
    }

    void shutdown() {
        if (tts != null) tts.shutdown();
        tts = null;
        ready = false;
    }
}
