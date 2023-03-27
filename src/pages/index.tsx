import React, { useRef, useState } from 'react';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import ReactSimpleWhiteBoard from 'react-simple-white-board';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface Prediction {
  output: string[];
  status: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [prediction, setPrediction] = useState<Prediction>();
  const [error, setError] = useState<string>('');

  const [disabled, setDisabled] = useState(false);

  const [prompt, setPrompt] = useState('');

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setDisabled(true);

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image: canvasRef.current?.toDataURL()
        }),
      });

      let prediction = await response.json();

      if (response.status !== 201) {
        setError(prediction.detail);
        return;
      }

      setPrediction(prediction);
      window.scrollTo(0, 0);

      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await sleep(1000);

        const response = await fetch("/api/predictions/" + prediction.id);
        prediction = await response.json();

        if (response.status !== 200) {
          setError(prediction.detail);
          return;
        }

        console.log({ prediction });
        setPrediction(prediction);
      }
    } catch (error) {
      console.error('Failed to fetch prediction', error);
      setError('Failed to fetch prediction');
    } finally {
      setDisabled(false);
    }
  };

  const handleRestart = () => {
    setPrediction(undefined);
    setPrompt('');
    setDisabled(false);
  };

  return (
    <>
      <Head>
        <title>Finish my sketch</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={styles.main}>
        <div className={styles.content}>
          {!prediction &&
            <>
              <div className={styles.whiteBoard}>
                <ReactSimpleWhiteBoard ref={canvasRef} />
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Enter a prompt to display an image"
                  disabled={disabled}
                />
                <button type="submit" disabled={disabled}>Go!</button>
              </form>
            </>
          }

          {error && <div>{error}</div>}

          {prediction && (
            <div className={styles.predictionContainer}>
              <p>status: {prediction.status}</p>
              {prediction.output && (
                <div className={styles.imageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prediction.output[prediction.output.length - 1]}
                    alt="output"
                  />
                </div>
              )}
              {prediction.status === 'succeeded' && <button onClick={handleRestart}>Restart</button>}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
