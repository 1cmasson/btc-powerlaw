'use client'
import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";


const LogLogChart = ({ data }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)
        
        // Create a div element for the tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('padding', '5px')
            .style('background', 'lightgray')
            .style('border', '1px solid #000')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        // Set up scales
        const xScale = d3.scaleLog()
            .domain(d3.extent(data, d => d.date.getTime()))
            .range([0, width]);

        const yScale = d3.scaleLog()
            .domain(d3.extent(data, d => d.price))
            .range([height, 0]);

        // Set up axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(7)
            .tickFormat(d3.timeFormat("%Y-%m-%d"));

        const yAxis = d3.axisLeft(yScale)
            .ticks(10, "~s");

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        
        // Add X grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${height})`)
            .call(
              d3.axisBottom(xScale)
                .ticks(10)
                .tickSize(-height)
                .tickFormat(() => '')
            )
            .selectAll('line')
            .attr('class', 'stroke-gray-300 opacity-70'); 
        
        // Add Y grid lines
        svg.append('g')
        .attr('class', 'grid')
        .call(
        d3.axisLeft(yScale)
            .ticks(10)
            .tickSize(-width)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('class', 'stroke-gray-300 opacity-70'); // Tailwind classes

        svg.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        const line = d3.line()
        .x(d => xScale(d.date.getTime()))
        .y(d => yScale(d.price));

        // Add the line path
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 3.5)
            .attr('d', line)

        // Draw points
        svg.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.date.getTime()))
            .attr('cy', d => yScale(d.price))
            .attr('r', 5)
            .attr('fill', 'transparent')
            .on('mouseover', (event, d) => {
                tooltip.transition().duration(100).style('opacity', 0.9);
                tooltip.html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Price: ${d.price}`)
                    .style('left', (event.pageX + 5) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mousemove', (event) => {
                tooltip.style('left', (event.pageX + 5) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition().duration(500).style('opacity', 0);
            });
        // Calculate the power law trend line
        const logX = data.map(d => Math.log(d.date.getTime()));
        const logY = data.map(d => Math.log(d.price));
        const n = data.length;

        const sumLogX = d3.sum(logX);
        const sumLogY = d3.sum(logY);
        const sumLogXLogY = d3.sum(logX.map((d, i) => d * logY[i]));
        const sumLogX2 = d3.sum(logX.map(d => d * d));

        let slope = (n * sumLogXLogY - sumLogX * sumLogY) / (n * sumLogX2 - sumLogX * sumLogX);
        let intercept = (sumLogY - slope * sumLogX) / n;

        // Round slope and intercept to 4 decimal places
        slope = Math.round(slope * 10000) / 10000;
        intercept = Math.round(intercept * 10000) / 10000;

        console.log("Slope:", slope);
        console.log("Intercept:", intercept);

        // Check if the values are valid
        if (isNaN(slope) || isNaN(intercept) || !isFinite(slope) || !isFinite(intercept)) {
            console.error("Invalid slope or intercept calculated.");
            return;
        }

        // Generate the trend line data
        const trendLineData = data.map(d => {
            const logPrice = intercept + slope * Math.log(d.date.getTime());
            const price = Math.exp(logPrice);
            if (isNaN(price) || !isFinite(price)) {
                console.error("Invalid value in trend line data generation:", logPrice, price);
            }
            return {
                date: d.date,
                price: price
            };
        });

        // Filter out NaN and Infinity values if any
        const filteredTrendLineData = trendLineData.filter(d => !isNaN(d.price) && isFinite(d.price));

        // Create the trend line generator
        const trendLine = d3.line()
            .x(d => xScale(d.date.getTime()))
            .y(d => yScale(d.price));

        // Add the trend line path
        svg.append('path')
            .datum(filteredTrendLineData)
            .attr('fill', 'none')
            .attr('stroke', 'red')
            .attr('stroke-width', 1.5)
            .attr('d', trendLine);
    }, [svgRef.current]);

    return <svg ref={svgRef}></svg>;
};

export default LogLogChart;
