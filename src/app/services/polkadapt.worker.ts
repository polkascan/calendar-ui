/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2022 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const intervalDuration = 2000;
let runningInterval: any = null;

addEventListener('message', ({data}) => {
  if (data === 'start') {
    let heartBeat = new Date().getTime();
    runningInterval = setInterval(() => {
      const systole = new Date().getTime();

      if ((systole - heartBeat) > (intervalDuration + 50)) {
        // The web worker was interrupted, this probably happened because of a computer suspend or stalled browser.
        postMessage('wake');
      }

      heartBeat = systole;
    }, intervalDuration)
  }

  if (data === 'stop') {
    if (runningInterval) {
      clearInterval(runningInterval);
      runningInterval = null;
    }
  }
});
