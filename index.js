process.env.TZ = 'America/Sao_Paulo';

const db = require('better-sqlite3')('database.db');
const fs = require('fs');
const tmi = require('tmi.js');

fs.readFile('database.sql', { encoding: 'utf8' }, (err, data) =>
{
    if (err)
    {
        console.error(err);
        return;
    }

    db.exec(data);
});

const client = new tmi.client({
    identity:
    {
        username: 'my_username',
        password: 'oauth:my_token'
    },
    channels: ['my_channel']
});

client.connect();

client.on('message', (channel, tags, message, self) =>
{
	if (self) return;

    message = message.trim();

    if (!message.startsWith('!'))
    {
        return;
    }

    const args = message.substring(1).split(' ');
	const command = args.shift().toLowerCase();

    if (commands.hasOwnProperty(command))
    {
        commands[command](channel, tags, args).then(result =>
        {
            if (result)
            {
                console.log(`* Comando ${command} executado`);
            }
        });
    }
    else
    {
        console.log(`* Comando ${command} desconhecido`);
    }
});

client.on('connected', (addr, port) =>
{
    console.log(`* Connected to ${addr}:${port}`);
});

const commands =
{
    'sorteio': async (channel, data, args) =>
    {
        // Fa 
        if (data.username == channel.substring(1))
        {
            arr = [];

            query = 'SELECT * FROM followers';
            stmt = db.prepare(query);

            for (const row of stmt.iterate())
            {
                if (row.points >= 5)
                {
                    for (let i = 0; i < row.points; i++)
                    {
                        arr.push(row.username);
                    }
                }
            }

            arr = arr.sort(() => Math.random() - 0.5);
            random = rand(0, arr.length - 1);
            winner = arr[random];

            // Alert
            const response = await fetch('http://localhost/emit.php?username=' + winner);

            if (response.ok)
            {
                client.say(channel, `${winner} ganhador do sorteio.`);
            }

            return true;
        }

        if (args[0] == 'pontos')
        {
            query = 'SELECT points FROM followers WHERE username = ?';
            stmt = db.prepare(query);
            row = stmt.get(data.username);

            if (row != undefined)
            {
                client.say(channel, `${data.username} Você tem ${row.points} ponto(s).`);
            }

            return true;
        }

        const time = Date.now();

        query = 'SELECT * FROM followers WHERE username = ? ORDER BY id DESC LIMIT 1';
        stmt = db.prepare(query);
        row = stmt.get(data.username);

        // Adiciona um novo usuário na tabela
        if (row == undefined)
        {
            query = 'INSERT INTO followers (username, points, created_date) VALUES (?, ?, ?)';

            stmt = db.prepare(query);
            stmt.run(data.username, 1, time);

            client.say(channel, `${data.username} Falta mais 4 pontos para você participar do sorteio.`);

            return true;
        }

        const waiting_time = 1000 * 300;

        // Atualiza os pontos do usuário
        if (time > row.created_date + waiting_time)
        {
            query = 'UPDATE followers SET points = points + 1, created_date = ? WHERE username = ?';

            stmt = db.prepare(query);
            stmt.run(time, data.username);

            client.say(channel, `${data.username} Você ganhou mais 1 ponto.`);
        }
        else
        {
            remaining_time = row.created_date + waiting_time - time;

            remaining = new Date(remaining_time).getMinutes();

            if (remaining == 0)
            {
                remaining = new Date(remaining_time).getSeconds();

                client.say(channel, `${data.username} Ganhe mais 1 ponto em ${remaining} seg.`);
            }
            else
            {
                client.say(channel, `${data.username} Ganhe mais 1 ponto em ${remaining} min.`);
            }
        }
        
        return true;
    },
    'loja': (channel, data) =>
    {
        client.say(channel, 'https://undeadstore.com.br/');

        return true;
    },
    'bodar': (channel, data) =>
    {
        client.say(channel, 'https://twitch.tv/dgobode');

        return true;
    }
}

function rand(min, max)
{
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min) + min);
}